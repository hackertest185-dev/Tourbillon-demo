// password reset operations using 6-digit verification codes
// Implements security best practices: cooldown, code expiration via Redis TTL, email delivery

using System.Net;
using System.Security.Cryptography;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;

namespace backend.Services;

public class PasswordResetService : IPasswordResetService
{
    private readonly UserManager<User> _userManager;
    private readonly IEmailService _emailService;
    private readonly IRedisService _redis;
    private readonly OtpSecurityService _otpSecurity;
    private readonly ILogger<PasswordResetService> _logger;
    private const int CodeExpirationMinutes = 10;
    private const int CooldownSeconds = 30; // Prevent spam: minimum time between requests
    private const int MaxInvalidAttempts = 5;

    public PasswordResetService(
        UserManager<User> userManager,
        IEmailService emailService,
        IRedisService redis,
        OtpSecurityService otpSecurity,
        ILogger<PasswordResetService> logger)
    {
        _userManager = userManager;
        _emailService = emailService;
        _redis = redis;
        _otpSecurity = otpSecurity;
        _logger = logger;
    }

    // Generates a fresh 6-digit verification code and sends it via email.
    // A new request replaces the previous challenge after the cooldown, so old
    // codes cannot be replayed after a resend.
    public async Task<(bool Success, string Message)> RequestPasswordResetAsync(string email)
    {
        try
        {
            email = email.Trim();
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                // Don't reveal if email exists - security best practice
                _logger.LogWarning("Password reset requested for non-existent email: {Email}", email);
                return (true, "A verification code has been sent to your email.");
            }

            var scope = user.Id.ToString();
            var cacheKey = ChallengeKey(scope);
            var cooldownKey = CooldownKey(scope);

            // Check cooldown to prevent spam (30-second limit between requests)
            if (await _redis.GetStringAsync(cooldownKey) != null)
            {
                _logger.LogWarning("Cooldown in effect for password reset request: {Email}", email);
                return (false, $"Please wait {CooldownSeconds} seconds before requesting another code.");
            }

            var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            var codeHash = _otpSecurity.Hash("password-reset", scope, code);
            await _redis.SetStringAsync(cacheKey, codeHash, TimeSpan.FromMinutes(CodeExpirationMinutes));
            await _redis.RemoveAsync(AttemptsKey(scope));
            _logger.LogInformation("Generated new password reset challenge for user {UserId}", user.Id);

            // Set cooldown timer to prevent rapid successive requests
            await _redis.SetStringAsync(cooldownKey, "1", TimeSpan.FromSeconds(CooldownSeconds));

                var docTitle = "Your Tourbillon password reset code";
                var greet = string.IsNullOrWhiteSpace(user.FirstName) ? "there" : user.FirstName;
                var greeting = WebUtility.HtmlEncode(greet);
                var innerRows = $@"
                <tr><td style=""padding:36px 40px 8px;"">
                    <h2 style=""margin:0 0 16px;color:#1a1613;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:normal;"">Password reset verification</h2>
                    <p style=""margin:0 0 12px;color:#4a4440;font-size:15px;line-height:1.7;"">Hello {greeting},</p>
                    <p style=""margin:0 0 12px;color:#4a4440;font-size:15px;line-height:1.7;"">You requested to reset your password for your Tourbillon account. Use the code below on the password reset page to continue.</p>
                </td></tr>
{TransactionalEmailLayout.CodePillRow(code)}
                <tr><td style=""padding:8px 40px 36px;"">
                    <p style=""margin:0 0 12px;color:#4a4440;font-size:14px;line-height:1.7;"">This code expires in {CodeExpirationMinutes} minutes.</p>
                    <p style=""margin:0 0 12px;color:#4a4440;font-size:14px;line-height:1.7;"">If you didn't request this password reset, you can safely ignore this email.</p>
                    <p style=""margin:0;color:#4a4440;font-size:14px;line-height:1.7;"">Best regards,<br>Tourbillon</p>
                </td></tr>";
                var emailBody = TransactionalEmailLayout.BuildCustomerEmail(docTitle, innerRows);

            var emailSent = await _emailService.SendEmailAsync(
                user.Email!,
                "Your Tourbillon Password Reset Code",
                emailBody);

            if (!emailSent)
            {
                _logger.LogError("Failed to send password reset email to {Email}", email);
                return (false, "Failed to send email. Please try again later.");
            }

            _logger.LogInformation("Password reset code sent to {Email}", email);
            return (true, "If an account with that email exists, a verification code has been sent.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing password reset request for {Email}", email);
            return (false, "An error occurred. Please try again later.");
        }
    }

    // Verifies the 6-digit code without resetting the password
    public async Task<(bool Success, string Message, string? VerificationGrant)> VerifyCodeAsync(string email, string code)
    {
        try
        {
            email = email.Trim();
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                return (false, "Invalid verification code.", null);
            }

            var scope = user.Id.ToString();
            var cacheKey = ChallengeKey(scope);
            var storedHash = await _redis.GetStringAsync(cacheKey);
            if (storedHash == null || !_otpSecurity.Matches(storedHash, "password-reset", scope, code))
            {
                await RecordInvalidAttemptAsync(scope, cacheKey);
                _logger.LogWarning("Invalid password reset code verification for {Email}", email);
                return (false, "Invalid or expired verification code. Please request a new code.", null);
            }

            if (!await _redis.CompareAndRemoveAsync(cacheKey, storedHash))
                return (false, "Invalid or expired verification code. Please request a new code.", null);

            await _redis.RemoveAsync(AttemptsKey(scope));
            var grant = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
            await _redis.SetStringAsync(GrantKey(grant), $"{user.Id}:{OtpSecurityService.NormalizeEmail(user.Email ?? email)}", TimeSpan.FromMinutes(2));
            _logger.LogInformation("Password reset code verified for {Email}", email);
            return (true, "Code verified successfully.", grant);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying code for {Email}", email);
            return (false, "An error occurred. Please try again.", null);
        }
    }

    // Resets the user's password using the provided 6-digit code
    public async Task<(bool Success, string Message)> ResetPasswordAsync(string email, string verificationGrant, string newPassword)
    {
        try
        {
            email = email.Trim();
            if (string.IsNullOrWhiteSpace(verificationGrant))
                return (false, "Invalid or expired verification grant.");

            var grantKey = GrantKey(verificationGrant);
            var grantValue = await _redis.GetStringAsync(grantKey);
            var parts = grantValue?.Split(':', 2);
            if (parts is not { Length: 2 } || !int.TryParse(parts[0], out var userId))
                return (false, "Invalid or expired verification grant.");

            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null || !string.Equals(OtpSecurityService.NormalizeEmail(user.Email ?? ""), parts[1], StringComparison.Ordinal))
                return (false, "Invalid or expired verification grant.");

            if (!await _redis.CompareAndRemoveAsync(grantKey, grantValue!))
                return (false, "Invalid or expired verification grant.");

            // Generate token and reset password
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, newPassword);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                _logger.LogWarning("Password reset failed for {Email}: {Errors}", email, errors);
                return (false, errors);
            }

            // Rotate the security stamp so previously issued sessions become
            // invalid during the next security-stamp validation.
            await _userManager.UpdateSecurityStampAsync(user);

            _logger.LogInformation("Password reset successful for {Email}", email);
            return (true, "Password has been reset successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password for {Email}", email);
            return (false, "An error occurred. Please try again.");
        }
    }

    private async Task RecordInvalidAttemptAsync(string scope, string challengeKey)
    {
        var attempts = await _redis.IncrementAsync(AttemptsKey(scope), TimeSpan.FromMinutes(CodeExpirationMinutes));
        if (attempts >= MaxInvalidAttempts)
        {
            await _redis.RemoveAsync(challengeKey);
            await _redis.RemoveAsync(AttemptsKey(scope));
        }
    }

    private static string ChallengeKey(string scope) => $"password-reset:{scope}";
    private static string CooldownKey(string scope) => $"password-reset-cooldown:{scope}";
    private static string AttemptsKey(string scope) => $"password-reset-attempts:{scope}";
    private static string GrantKey(string grant) => $"password-reset-grant:{grant}";
}

