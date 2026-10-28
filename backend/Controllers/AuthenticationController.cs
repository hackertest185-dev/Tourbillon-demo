// This controller handles user authentication operations (login, logout, register).
// It follows Single Responsibility Principle by focusing only on authentication concerns.
using System.Security.Claims;
using backend.Models;
using backend.Services;
using backend.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthenticationController : ControllerBase
{
    private readonly SignInManager<User> _signInManager;
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<IdentityRole<int>> _roleManager;
    private readonly IUserRegistrationService _userRegistrationService;
    private readonly IPasswordResetService _passwordResetService;
    private readonly IMagicLoginService _magicLoginService;
    private readonly IRoleManagementService _roleManagement;
    private readonly ILogger<AuthenticationController> _logger;
    private readonly Microsoft.AspNetCore.Authentication.IAuthenticationSchemeProvider _schemes;
    private readonly IConfiguration _configuration;

    public AuthenticationController(
        SignInManager<User> signInManager,
        UserManager<User> userManager,
        RoleManager<IdentityRole<int>> roleManager,
        IUserRegistrationService userRegistrationService,
        IPasswordResetService passwordResetService,
        IMagicLoginService magicLoginService,
        IRoleManagementService roleManagement,
        ILogger<AuthenticationController> logger,
        Microsoft.AspNetCore.Authentication.IAuthenticationSchemeProvider schemes,
        IConfiguration configuration)
    {
        _signInManager = signInManager;
        _userManager = userManager;
        _roleManager = roleManager;
        _userRegistrationService = userRegistrationService;
        _passwordResetService = passwordResetService;
        _magicLoginService = magicLoginService;
        _roleManagement = roleManagement;
        _logger = logger;
        _schemes = schemes;
        _configuration = configuration;
    }

    // POST: api/authentication/register
    // Registers a new user.
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register(RegisterDto registerDto)
    {
        var (success, message) = await _userRegistrationService.RegisterUserAsync(registerDto);
        
        if (!success)
        {
            return BadRequest(new { message = message });
        }

        return Ok(new { message = message });
    }

    // POST: api/authentication/check-email
    // Returns whether an email address is already registered. Used by the smart-email auth entry.
    [HttpPost("check-email")]
    [AllowAnonymous]
    public IActionResult CheckEmail([FromBody] CheckEmailDto dto)
    {
        // Do not expose account existence to unauthenticated callers. The
        // frontend uses a unified login/register flow instead.
        return Ok(new { message = "If the address is registered, continue with sign in; otherwise create an account." });
    }

    // POST: api/authentication/login
    // Authenticates a user and signs them in.
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginDto loginDto)
    {
        var result = await _signInManager.PasswordSignInAsync(
            loginDto.Email, 
            loginDto.Password, 
            isPersistent: false, 
            lockoutOnFailure: true);

        if (result.RequiresTwoFactor)
            return Ok(new { message = "Authenticator verification required.", requiresMfa = true });

        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "Invalid login attempt." });
        }

        _logger.LogInformation("User logged in successfully: {Email}", loginDto.Email);
        return Ok(new { message = "Login successful" });
    }

    [HttpGet("mfa/status")]
    [Authorize]
    public async Task<IActionResult> MfaStatus()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var isAdmin = User.IsInRole("Admin");
        return Ok(new { enabled = user.TwoFactorEnabled, required = isAdmin && _configuration.GetValue<bool>("AdminSecurity:RequireMfaForWrites") });
    }

    [HttpGet("csrf")]
    [AllowAnonymous]
    public IActionResult CsrfToken()
    {
        var antiforgery = HttpContext.RequestServices.GetRequiredService<Microsoft.AspNetCore.Antiforgery.IAntiforgery>();
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new { token = tokens.RequestToken });
    }

    [HttpPost("mfa/setup")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> MfaSetup()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();

        var key = await _userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrWhiteSpace(key))
        {
            var reset = await _userManager.ResetAuthenticatorKeyAsync(user);
            if (!reset.Succeeded) return BadRequest(new { message = "Unable to initialize authenticator setup." });
            key = await _userManager.GetAuthenticatorKeyAsync(user);
        }

        var email = Uri.EscapeDataString(user.Email ?? user.UserName ?? "admin");
        var issuer = Uri.EscapeDataString("Tourbillon");
        return Ok(new
        {
            sharedKey = key,
            authenticatorUri = $"otpauth://totp/{issuer}:{email}?secret={key}&issuer={issuer}"
        });
    }

    [HttpPost("mfa/enable")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> EnableMfa([FromBody] MfaCodeDto dto)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var valid = await _userManager.VerifyTwoFactorTokenAsync(
            user,
            TokenOptions.DefaultAuthenticatorProvider,
            dto.Code.Replace(" ", string.Empty));
        if (!valid) return BadRequest(new { message = "Invalid authenticator code." });

        var result = await _userManager.SetTwoFactorEnabledAsync(user, true);
        if (!result.Succeeded) return BadRequest(new { message = "Unable to enable MFA." });
        var recoveryCodes = await _userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
        await _userManager.UpdateSecurityStampAsync(user);
        await _signInManager.SignInWithClaimsAsync(user, isPersistent: false, new[] { new Claim("mfa", "true") });
        return Ok(new { message = "MFA enabled successfully.", recoveryCodes });
    }

    [HttpPost("mfa/verify")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyMfa([FromBody] MfaCodeDto dto)
    {
        var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();
        user ??= await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();
        if (!await _userManager.IsInRoleAsync(user, "Admin")) return Forbid();
        var valid = await _userManager.VerifyTwoFactorTokenAsync(
            user,
            TokenOptions.DefaultAuthenticatorProvider,
            dto.Code.Replace(" ", string.Empty));
        if (!valid) return Unauthorized(new { message = "Invalid authenticator code." });

        await _signInManager.SignInWithClaimsAsync(
            user,
            isPersistent: false,
            new[] { new Claim("mfa", "true") });
        return Ok(new { message = "Authenticator verified." });
    }

    // POST: api/authentication/logout
    // Signs the current user out.
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        _logger.LogInformation("User logged out successfully");
        return Ok(new { message = "Logout successful" });
    }

    // POST: api/authentication/forgot-password
    // Sends a password reset email to the user.
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new { message = "Email is required." });
            }

            var (success, message) = await _passwordResetService.RequestPasswordResetAsync(dto.Email);
            
            if (!success)
            {
                return BadRequest(new { message = message });
            }

            return Ok(new { message = message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in ForgotPassword");
            return StatusCode(500, new { message = "An error occurred. Please try again later." });
        }
    }

    // POST: api/authentication/verify-code
    // Verifies the password reset code without resetting the password.
    [HttpPost("verify-code")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyCode(VerifyCodeDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Code))
            {
                return BadRequest(new { message = "Email and code are required." });
            }

            var (success, message, verificationGrant) = await _passwordResetService.VerifyCodeAsync(dto.Email, dto.Code);
            
            if (!success)
            {
                return BadRequest(new { message = message });
            }

            return Ok(new { message, verificationGrant });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in VerifyCode");
            return StatusCode(500, new { message = "An error occurred. Please try again later." });
        }
    }

    // POST: api/authentication/reset-password
    // Resets the user's password using the provided 6-digit code.
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.VerificationGrant) || string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                return BadRequest(new { message = "Email, verification grant, and new password are required." });
            }

            var (success, message) = await _passwordResetService.ResetPasswordAsync(
                dto.Email,
                dto.VerificationGrant,
                dto.NewPassword);

            if (!success)
            {
                return BadRequest(new { message = message });
            }

            return Ok(new { message = message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in ResetPassword");
            return StatusCode(500, new { message = "An error occurred. Please try again later." });
        }
    }

    // POST: api/authentication/setup-first-admin
    // Initial setup endpoint to promote the first authenticated user to Admin role
    // Only works if no admins exist yet (one-time setup)
    // After first admin is assigned, this endpoint returns an error
    [HttpPost("setup-first-admin")]
    [Authorize]
    public async Task<IActionResult> SetupFirstAdmin()
    {
        try
        {
            if (!_configuration.GetValue<bool>("AdminSettings:AllowFirstAdminSetup"))
                return NotFound();

            // Check if Admin role exists
            var adminRoleExists = await _roleManager.RoleExistsAsync("Admin");
            if (!adminRoleExists)
            {
                return BadRequest(new { message = "Admin role has not been created yet. Please try again later." });
            }

            // Check if any admin users already exist
            var adminRole = await _roleManager.FindByNameAsync("Admin");
            var adminUsersCount = (await _userManager.GetUsersInRoleAsync("Admin")).Count;

            if (adminUsersCount > 0)
            {
                return BadRequest(new
                {
                    message = "Admin already exists. For security reasons, only the first user can use this endpoint."
                });
            }

            // Get the current authenticated user
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            // Assign Admin role to current user
            var result = await _userManager.AddToRoleAsync(currentUser, "Admin");
            if (result.Succeeded)
            {
                _logger.LogInformation("User {Email} has been promoted to Admin role during initial setup", currentUser.Email);
                return Ok(new
                {
                    success = true,
                    message = $"Successfully promoted {currentUser.Email} to Admin role",
                    email = currentUser.Email,
                    role = "Admin"
                });
            }

            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            _logger.LogError("Failed to promote user {Email} to Admin: {Errors}", currentUser.Email, errors);
            return BadRequest(new { message = $"Failed to assign Admin role: {errors}" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SetupFirstAdmin");
            return StatusCode(500, new { message = $"Error during admin setup: {ex.Message}" });
        }
    }

    // GET: api/authentication/google
    // Initiates Google OAuth flow — full browser redirect, not XHR.
    // Pass ?popup=true to use the popup window flow (postMessage back to opener).
    // Returns 503 if Google credentials are not configured (e.g. Docker without env vars).
    [HttpGet("google")]
    [AllowAnonymous]
    public async Task<IActionResult> GoogleLogin([FromQuery] bool popup = false)
    {
        var scheme = await _schemes.GetSchemeAsync("Google");
        if (scheme == null)
            return StatusCode(503, new { message = "Google login is not configured on this server." });

        // The frontend proxy owns the public OAuth callback. Align the request
        // URL with the configured public frontend so Google never receives a
        // localhost or plain-http redirect from a TLS-terminating host.
        var publicFrontend = GetFrontendBaseUrl();
        if (Uri.TryCreate(publicFrontend, UriKind.Absolute, out var frontendUri))
        {
            Request.Scheme = frontendUri.Scheme;
            Request.Host = new HostString(frontendUri.Authority);
        }

        // Google returns through the frontend's same-origin backend proxy.
        // Generating this from the API request would omit `/api/backend` and
        // send the browser to a frontend route that does not exist.
        var redirectUrl = $"{publicFrontend.TrimEnd('/')}/api/backend/authentication/google-callback";
        var properties  = _signInManager.ConfigureExternalAuthenticationProperties("Google", redirectUrl);
        if (popup)
            properties.Items["popup"] = "1";
        return Challenge(properties, "Google");
    }

    // GET: api/authentication/google-callback
    // Receives the user after the Google middleware has validated the auth code and stored
    // the external login info in a temporary cookie. Finds or creates a local account,
    // signs the user in, and redirects to the frontend.
    [HttpGet("google-callback")]
    [AllowAnonymous]
    public async Task<IActionResult> GoogleCallback()
    {
        var frontendBase = GetFrontendBaseUrl();

        var info = await _signInManager.GetExternalLoginInfoAsync();
        if (info == null)
            return Redirect($"{frontendBase}/login?error=google-failed");

        var email = info.Principal.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrEmpty(email))
            return Redirect($"{frontendBase}/login?error=no-email");

        // Only a verified Google email can link to an existing local account.
        if (!string.Equals(info.Principal.FindFirstValue("urn:google:email_verified"), "true", StringComparison.OrdinalIgnoreCase))
            return Redirect($"{frontendBase}/login?error=unverified-email");

        // Google provider keys are stable even when the user changes their email address.
        var user = await _userManager.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
        var needsLink = user == null;
        user ??= await _userManager.FindByEmailAsync(email);
        var isNewAccount = false;
        if (user == null)
        {
            // Auto-create a passwordless account (user can add a password later via Edit Details)
            var firstName = info.Principal.FindFirstValue(ClaimTypes.GivenName) ?? string.Empty;
            var lastName  = info.Principal.FindFirstValue(ClaimTypes.Surname)   ?? string.Empty;
            user = new User { UserName = email, Email = email, FirstName = firstName, LastName = lastName, EmailConfirmed = true };
            var createResult = await _userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                _logger.LogError("Google OAuth: failed to create user {Email}: {Errors}",
                    email, string.Join(", ", createResult.Errors.Select(e => e.Description)));
                return Redirect($"{frontendBase}/login?error=create-failed");
            }
            isNewAccount = true;
        }

        // Never silently attach a Google identity to an existing local account.
        // A stolen or misdirected OAuth session must not become an account-linking
        // primitive; linking an existing account needs a separate re-auth flow.
        if (needsLink && !isNewAccount)
            return Redirect($"{frontendBase}/login?error=google-link-requires-verification");

        if (needsLink)
        {
            var linkResult = await _userManager.AddLoginAsync(user, info);
            if (!linkResult.Succeeded)
            {
                _logger.LogError("Unable to link Google sign-in: {Errors}", string.Join(", ", linkResult.Errors.Select(e => e.Code)));
                if (isNewAccount) await _userManager.DeleteAsync(user);
                return Redirect($"{frontendBase}/login?error=link-failed");
            }
        }

        // Sign in and set the application cookie
        await _signInManager.SignInAsync(user, isPersistent: false);
        await _roleManagement.AssignAdminIfConfiguredAsync(user);
        _logger.LogInformation("Google OAuth sign-in: {Email}", email);

        // Popup flow: redirect to a lightweight close-page that postMessages the opener
        var isPopup = info.AuthenticationProperties?.Items.TryGetValue("popup", out var popupVal) == true
                      && popupVal == "1";
        var callbackPath = isPopup ? "/auth/popup-close" : "/auth/callback";
        return Redirect($"{frontendBase}{callbackPath}?newAccount={(isNewAccount ? "1" : "0")}");
    }

    private string GetFrontendBaseUrl()
    {
        return (_configuration["AppSettings:FrontendBaseUrl"]
                ?? _configuration["FRONTEND_BASE_URL"]
                ?? "https://velora-five-umber.vercel.app")
            .TrimEnd('/');
    }

    // POST: api/authentication/magic-login/request
    // Step 1: Send a 6-char OTP to the given email. Always 200 — never reveals if email exists.
    [HttpPost("magic-login/request")]
    [AllowAnonymous]
    public async Task<IActionResult> MagicLoginRequest([FromBody] MagicLoginRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "Email is required." });

        await _magicLoginService.RequestAsync(dto.Email.Trim());
        return Ok(new { message = "If that email is valid, a sign-in code has been sent." });
    }

    // POST: api/authentication/magic-login/verify
    // Step 2: Validate the OTP, sign the user in (creating account if new), return 200.
    [HttpPost("magic-login/verify")]
    [AllowAnonymous]
    public async Task<IActionResult> MagicLoginVerify([FromBody] MagicLoginVerifyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Code))
            return BadRequest(new { message = "Email and code are required." });

        var (user, isNewAccount) = await _magicLoginService.VerifyAsync(dto.Email.Trim(), dto.Code.Trim());
        if (user == null)
            return Unauthorized(new { message = "Invalid or expired code." });

        // Email OTP is not a sufficient admin factor. Admins must use the
        // password + authenticator-app MFA flow instead.
        if (await _userManager.IsInRoleAsync(user, "Admin"))
            return Unauthorized(new { message = "Authenticator verification is required for administrator accounts." });

        await _signInManager.SignInAsync(user, isPersistent: false);
        _logger.LogInformation("Magic login sign-in: {Email}", user.Email);
        return Ok(new { message = "Sign-in successful.", IsNewAccount = isNewAccount });
    }

    // POST: api/authentication/test-email
    // Test endpoint to verify email configuration (REMOVE IN PRODUCTION)
    [HttpPost("test-email")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> TestEmail([FromBody] TestEmailDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new { message = "Email is required." });
            }

            _logger.LogInformation("Testing email send to {Email}", dto.Email);

            var emailService = HttpContext.RequestServices.GetRequiredService<IEmailService>();
            var result = await emailService.SendEmailAsync(
                dto.Email,
                "Test Email from Tourbillon",
                "<h1>Test Email</h1><p>If you received this, your SMTP configuration is working correctly!</p>");

            if (result)
            {
                return Ok(new { message = "Test email sent successfully! Check your inbox." });
            }
            else
            {
                return BadRequest(new { message = "Failed to send test email. Check server logs for details." });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending test email");
            return StatusCode(500, new { message = $"Error: {ex.Message}" });
        }
    }
} 
