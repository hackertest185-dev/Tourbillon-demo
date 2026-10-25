using System.Security.Cryptography;
using System.Text;

namespace backend.Services;

/// Shared protection for short-lived email codes. Codes are never stored in
/// plaintext and are scoped to both their purpose and their account.
public sealed class OtpSecurityService
{
    private readonly byte[] _pepper;
    private readonly ILogger<OtpSecurityService> _logger;

    public OtpSecurityService(IConfiguration configuration, ILogger<OtpSecurityService> logger)
    {
        var configuredPepper = configuration["AuthSecurity:OtpPepper"];
        if (string.IsNullOrWhiteSpace(configuredPepper))
        {
            if (!string.Equals(configuration["ASPNETCORE_ENVIRONMENT"], "Development", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("AuthSecurity:OtpPepper must be configured outside Development.");

            // Keeps local Development usable while making the missing secret
            // visible in logs. Production must set AUTH_OTP_PEPPER.
            configuredPepper = "tourbillon-local-otp-pepper-change-in-production";
            _logger = logger;
            _logger.LogWarning("AuthSecurity:OtpPepper is not configured; set AUTH_OTP_PEPPER before production deployment.");
        }
        else
        {
            _logger = logger;
        }

        _pepper = Encoding.UTF8.GetBytes(configuredPepper);
    }

    public string Hash(string purpose, string accountScope, string code)
    {
        var input = $"{purpose}\n{accountScope}\n{code.Trim().ToUpperInvariant()}";
        using var hmac = new HMACSHA256(_pepper);
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(input)));
    }

    public bool Matches(string storedHash, string purpose, string accountScope, string code)
    {
        var actual = Convert.FromHexString(Hash(purpose, accountScope, code));
        byte[] expected;
        try
        {
            expected = Convert.FromHexString(storedHash);
        }
        catch (FormatException)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    public static string NormalizeEmail(string email) => email.Trim().ToUpperInvariant();
}
