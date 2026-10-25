// Service for sending emails via SMTP using MailKit library
// Supports any authenticated SMTP provider and implements detailed logging for debugging
// Configured through appsettings.json with SMTP host, port, and credentials
using Microsoft.Extensions.Options;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace backend.Services;

public class SmtpOptions
{
    public const string SectionName = "Smtp";
    
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = string.Empty;
}

public class EmailService : IEmailService
{
    private readonly SmtpOptions _smtpOptions;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<SmtpOptions> smtpOptions, ILogger<EmailService> logger)
    {
        _smtpOptions = smtpOptions.Value;
        _logger = logger;
    }

    // Sends an email using SMTP configuration with MailKit for reliable STARTTLS support
    public async Task<bool> SendEmailAsync(string to, string subject, string body)
    {
        try
        {
            // Log SMTP configuration (without password)
            _logger.LogInformation("Attempting to send email to {To} using SMTP: {Host}:{Port}, SSL: {Ssl}, Username: {Username}", 
                to, _smtpOptions.Host, _smtpOptions.Port, _smtpOptions.EnableSsl, _smtpOptions.Username);

            if (string.IsNullOrWhiteSpace(_smtpOptions.Host))
            {
                _logger.LogWarning("SMTP host is missing. Email not sent to {Email}", to);
                return false;
            }

            var hasCredentials = !string.IsNullOrWhiteSpace(_smtpOptions.Username) ||
                                  !string.IsNullOrWhiteSpace(_smtpOptions.Password);
            if (hasCredentials && (string.IsNullOrWhiteSpace(_smtpOptions.Username) ||
                                   string.IsNullOrWhiteSpace(_smtpOptions.Password)))
            {
                _logger.LogWarning("SMTP credentials are incomplete. Email not sent to {Email}", to);
                return false;
            }

            var trimmedPassword = _smtpOptions.Password?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(_smtpOptions.FromAddress))
            {
                _logger.LogWarning("SMTP sender address is missing. Email not sent to {Email}", to);
                return false;
            }

            // Create MIME message
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_smtpOptions.FromName, _smtpOptions.FromAddress));
            message.To.Add(new MailboxAddress("", to));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder { HtmlBody = body };
            message.Body = bodyBuilder.ToMessageBody();

            // Connect to SMTP server using MailKit with improved configuration
            using var client = new SmtpClient();
            
            // Set timeout to prevent hanging
            client.Timeout = 30000; // 30 seconds
            
            _logger.LogInformation("Connecting to SMTP server {Host}:{Port}...", _smtpOptions.Host, _smtpOptions.Port);
            
            var socketOptions = _smtpOptions.Port == 465
                ? SecureSocketOptions.SslOnConnect
                : _smtpOptions.EnableSsl
                    ? SecureSocketOptions.StartTls
                    : SecureSocketOptions.None;
            _logger.LogInformation("Using SMTP security mode {SecurityMode}", socketOptions);
            
            // Connect with SSL validation
            await client.ConnectAsync(_smtpOptions.Host, _smtpOptions.Port, socketOptions);
            _logger.LogInformation("SMTP connection established. Server capabilities: {Capabilities}", client.Capabilities);

            // Local SMTP capture services such as Mailpit do not require authentication.
            if (!hasCredentials)
            {
                _logger.LogInformation("SMTP server does not require authentication; sending without credentials");
            }
            else if (!client.AuthenticationMechanisms.Contains("PLAIN") && !client.AuthenticationMechanisms.Contains("LOGIN"))
            {
                _logger.LogWarning("Server may not support standard authentication. Available mechanisms: {Mechanisms}", 
                    string.Join(", ", client.AuthenticationMechanisms));
            }

            if (hasCredentials)
            {
                _logger.LogInformation("Authenticating with username: {Username}, Password length: {Length}",
                    _smtpOptions.Username, trimmedPassword.Length);
                try
                {
                    await client.AuthenticateAsync(_smtpOptions.Username, trimmedPassword);
                    _logger.LogInformation("Authentication successful");
                }
                catch (MailKit.Security.AuthenticationException authEx)
                {
                    _logger.LogError(authEx, "SMTP authentication failed for {Email}. Verify the SMTP username, password, host and port.", to);
                    await client.DisconnectAsync(true);
                    return false;
                }
            }
            
            _logger.LogInformation("Sending email...");
            
            // Send email
            await client.SendAsync(message);
            
            // Disconnect gracefully
            await client.DisconnectAsync(true);
            
            _logger.LogInformation("Email sent successfully to {Email}", to);
            return true;
        }
        catch (MailKit.Security.AuthenticationException authEx)
        {
            _logger.LogError(authEx, "SMTP authentication failed for {Email}. Verify the SMTP username, password, host and port.",
                to);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}. Exception Type: {Type}, Message: {Message}", 
                to, ex.GetType().Name, ex.Message);
            return false;
        }
    }
}

