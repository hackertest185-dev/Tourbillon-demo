// Handles OTP-based first-time password setup for users with no password (Google/magic-link sign-in).
// Generates a 6-char alphanumeric code, stores it in Redis under pwd-setup:{userId},
// and delivers it via email. ConfirmAsync verifies the code then sets the password.
using System.Net;
using System.Security.Cryptography;
using backend.Models;
using Microsoft.AspNetCore.Identity;

namespace backend.Services;

public interface IPasswordSetupService
{
    Task RequestAsync(User user);
    Task<(bool Success, string Message)> ConfirmAsync(User user, string code, string newPassword);
}

public class PasswordSetupService : IPasswordSetupService
{
    private readonly UserManager<User> _userManager;
    private readonly IEmailService _emailService;
    private readonly IRedisService _redis;
    private readonly OtpSecurityService _otpSecurity;
    private readonly ILogger<PasswordSetupService> _logger;

    // Same charset as MagicLoginService — avoids ambiguous chars (0/O, 1/I/L)
    private const string CodeChars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 6;
    private const int TtlMinutes = 10;
    private const int CooldownSeconds = 60;
    private const int MaxInvalidAttempts = 5;

    public PasswordSetupService(
        UserManager<User> userManager,
        IEmailService emailService,
        IRedisService redis,
        OtpSecurityService otpSecurity,
        ILogger<PasswordSetupService> logger)
    {
        _userManager = userManager;
        _emailService = emailService;
        _redis = redis;
        _otpSecurity = otpSecurity;
        _logger = logger;
    }

    // Generates a code, stores it in Redis, and sends it to the user's email.
    public async Task RequestAsync(User user)
    {
        if (user.PasswordHash != null)
            throw new InvalidOperationException("User already has a password.");

        var cooldownKey = CooldownRedisKey(user.Id);
        if (await _redis.GetStringAsync(cooldownKey) != null)
            throw new InvalidOperationException("Please wait before requesting another code.");

        var code = GenerateCode();
        var key = RedisKey(user.Id);
        var scope = user.Id.ToString();
        var codeHash = _otpSecurity.Hash("password-setup", scope, code);
        await _redis.SetStringAsync(key, codeHash, TimeSpan.FromMinutes(TtlMinutes));
        await _redis.RemoveAsync(AttemptsRedisKey(user.Id));
        await _redis.SetStringAsync(cooldownKey, "1", TimeSpan.FromSeconds(CooldownSeconds));

        var firstName = string.IsNullOrWhiteSpace(user.FirstName) ? "there" : user.FirstName;
        var subject = "Set up your Tourbillon password";
        var greeting = WebUtility.HtmlEncode(firstName);
        var innerRows = $@"
                <tr><td style=""padding:36px 40px 8px;"">
                    <h2 style=""margin:0 0 16px;color:#1a1613;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:normal;"">Set up your Tourbillon password</h2>
                    <p style=""margin:0 0 12px;color:#4a4440;font-size:15px;line-height:1.7;"">Hello {greeting},</p>
                    <p style=""margin:0 0 8px;color:#4a4440;font-size:15px;line-height:1.7;"">Use the code below to set a password for your Tourbillon account.</p>
                </td></tr>
{TransactionalEmailLayout.CodePillRow(code)}
                <tr><td style=""padding:8px 40px 36px;"">
                    <p style=""margin:0 0 12px;color:#4a4440;font-size:14px;line-height:1.7;"">This code expires in {TtlMinutes} minutes. If you didn't request this, you can safely ignore it.</p>
                    <p style=""margin:0;color:#4a4440;font-size:14px;line-height:1.7;"">Best regards,<br>Tourbillon</p>
                </td></tr>";
        var body = TransactionalEmailLayout.BuildCustomerEmail(subject, innerRows);
        var sent = await _emailService.SendEmailAsync(user.Email!, subject, body);
        if (!sent)
        {
            _logger.LogError("Password setup: failed to send code to user {UserId}", user.Id);
            throw new InvalidOperationException("Failed to send verification email.");
        }

        _logger.LogInformation("Password setup code sent to user: {UserId}", user.Id);
    }

    // Verifies the code, then resets the password using a server-side generated token.
    public async Task<(bool Success, string Message)> ConfirmAsync(User user, string code, string newPassword)
    {
        var key = RedisKey(user.Id);
        var scope = user.Id.ToString();
        var stored = await _redis.GetStringAsync(key);

        if (stored == null || !_otpSecurity.Matches(stored, "password-setup", scope, code))
        {
            var attempts = await _redis.IncrementAsync(AttemptsRedisKey(user.Id), TimeSpan.FromMinutes(TtlMinutes));
            if (attempts >= MaxInvalidAttempts)
            {
                await _redis.RemoveAsync(key);
                await _redis.RemoveAsync(AttemptsRedisKey(user.Id));
            }
            _logger.LogWarning("Invalid setup code attempt for user: {UserId}", user.Id);
            return (false, "Invalid or expired code. Please request a new one.");
        }

        // Consume the challenge atomically to prevent concurrent replay.
        if (!await _redis.CompareAndRemoveAsync(key, stored))
            return (false, "Invalid or expired code. Please request a new one.");
        await _redis.RemoveAsync(AttemptsRedisKey(user.Id));

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, newPassword);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            _logger.LogWarning("Password setup failed for user: {UserId} - {Errors}", user.Id, errors);
            return (false, errors);
        }

        await _userManager.UpdateSecurityStampAsync(user);

        _logger.LogInformation("Password setup successful for user: {UserId}", user.Id);
        return (true, "Password set successfully");
    }

    private static string GenerateCode()
    {
        var chars = new char[CodeLength];
        for (int i = 0; i < CodeLength; i++)
            chars[i] = CodeChars[RandomNumberGenerator.GetInt32(CodeChars.Length)];
        return new string(chars);
    }

    private static string RedisKey(int userId) => $"pwd-setup:{userId}";
    private static string CooldownRedisKey(int userId) => $"pwd-setup-cooldown:{userId}";
    private static string AttemptsRedisKey(int userId) => $"pwd-setup-attempts:{userId}";
}
