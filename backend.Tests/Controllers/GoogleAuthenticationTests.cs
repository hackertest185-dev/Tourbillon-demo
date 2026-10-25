using System.Security.Claims;
using backend.Controllers;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace backend.Tests.Controllers;

public class GoogleAuthenticationTests
{
    private sealed class Harness
    {
        public Mock<UserManager<User>> Users { get; } = new(new Mock<IUserStore<User>>().Object,
            null!, null!, null!, null!, null!, null!, null!, null!);
        public Mock<SignInManager<User>> SignIn { get; }
        public AuthenticationController Controller { get; }

        public Harness(ExternalLoginInfo? info)
        {
            var schemes = Mock.Of<IAuthenticationSchemeProvider>();
            SignIn = new Mock<SignInManager<User>>(Users.Object,
                new HttpContextAccessor { HttpContext = new DefaultHttpContext() },
                Mock.Of<IUserClaimsPrincipalFactory<User>>(), Options.Create(new IdentityOptions()),
                NullLogger<SignInManager<User>>.Instance, schemes, Mock.Of<IUserConfirmation<User>>());
            SignIn.Setup(s => s.GetExternalLoginInfoAsync(It.IsAny<string>())).ReturnsAsync(info);
            SignIn.Setup(s => s.SignInAsync(It.IsAny<User>(), It.IsAny<bool>(), It.IsAny<string>())).Returns(Task.CompletedTask);
            Users.Setup(u => u.FindByLoginAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync((User?)null);
            Users.Setup(u => u.FindByEmailAsync(It.IsAny<string>())).ReturnsAsync((User?)null);
            Users.Setup(u => u.CreateAsync(It.IsAny<User>())).ReturnsAsync(IdentityResult.Success);
            Users.Setup(u => u.AddLoginAsync(It.IsAny<User>(), It.IsAny<UserLoginInfo>())).ReturnsAsync(IdentityResult.Success);
            Users.Setup(u => u.DeleteAsync(It.IsAny<User>())).ReturnsAsync(IdentityResult.Success);
            var roles = new Mock<RoleManager<IdentityRole<int>>>(Mock.Of<IRoleStore<IdentityRole<int>>>(),
                Array.Empty<IRoleValidator<IdentityRole<int>>>(), null!, new IdentityErrorDescriber(),
                NullLogger<RoleManager<IdentityRole<int>>>.Instance);
            var roleService = new Mock<IRoleManagementService>();
            roleService.Setup(s => s.AssignAdminIfConfiguredAsync(It.IsAny<User>())).Returns(Task.CompletedTask);
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AppSettings:FrontendBaseUrl"] = "http://localhost:3000"
            }).Build();
            Controller = new AuthenticationController(SignIn.Object, Users.Object, roles.Object,
                Mock.Of<IUserRegistrationService>(), Mock.Of<IPasswordResetService>(), Mock.Of<IMagicLoginService>(),
                roleService.Object, NullLogger<AuthenticationController>.Instance, schemes, config);
        }
    }

    private static ExternalLoginInfo Info(bool verified = true, bool popup = false)
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Email, "google@example.test"),
            new Claim(ClaimTypes.GivenName, "Google"),
            new Claim(ClaimTypes.Surname, "User"),
            new Claim("urn:google:email_verified", verified ? "true" : "false")
        }, "Google"));
        var info = new ExternalLoginInfo(principal, "Google", "stable-google-id", "Google")
        {
            AuthenticationProperties = new AuthenticationProperties()
        };
        if (popup) info.AuthenticationProperties.Items["popup"] = "1";
        return info;
    }

    [Fact]
    public async Task MissingExternalCookie_ReturnsToLoginWithoutSigningIn()
    {
        var h = new Harness(null);
        var result = Assert.IsType<RedirectResult>(await h.Controller.GoogleCallback());
        Assert.EndsWith("/login?error=google-failed", result.Url);
        h.SignIn.Verify(s => s.SignInAsync(It.IsAny<User>(), It.IsAny<bool>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UnverifiedEmail_CannotLinkToAnExistingAccount()
    {
        var h = new Harness(Info(verified: false));
        var result = Assert.IsType<RedirectResult>(await h.Controller.GoogleCallback());
        Assert.EndsWith("/login?error=unverified-email", result.Url);
        h.Users.Verify(u => u.FindByEmailAsync(It.IsAny<string>()), Times.Never);
        h.Users.Verify(u => u.AddLoginAsync(It.IsAny<User>(), It.IsAny<UserLoginInfo>()), Times.Never);
    }

    [Fact]
    public async Task LinkedIdentity_IsResolvedByProviderKeyWithoutRelinking()
    {
        var h = new Harness(Info(popup: true));
        var user = new User { Id = 7, Email = "previous-email@example.test" };
        h.Users.Setup(u => u.FindByLoginAsync("Google", "stable-google-id")).ReturnsAsync(user);
        var result = Assert.IsType<RedirectResult>(await h.Controller.GoogleCallback());
        Assert.EndsWith("/auth/popup-close?newAccount=0", result.Url);
        h.Users.Verify(u => u.FindByEmailAsync(It.IsAny<string>()), Times.Never);
        h.Users.Verify(u => u.AddLoginAsync(It.IsAny<User>(), It.IsAny<UserLoginInfo>()), Times.Never);
        h.SignIn.Verify(s => s.SignInAsync(user, false, null), Times.Once);
    }

    [Fact]
    public async Task VerifiedExistingEmail_RequiresSeparateReauthenticationBeforeLinking()
    {
        var h = new Harness(Info());
        var existing = new User { Id = 9, Email = "google@example.test" };
        h.Users.Setup(u => u.FindByEmailAsync("google@example.test")).ReturnsAsync(existing);
        var result = Assert.IsType<RedirectResult>(await h.Controller.GoogleCallback());
        Assert.EndsWith("/login?error=google-link-requires-verification", result.Url);
        h.Users.Verify(u => u.CreateAsync(It.IsAny<User>()), Times.Never);
        h.Users.Verify(u => u.AddLoginAsync(It.IsAny<User>(), It.IsAny<UserLoginInfo>()), Times.Never);
        h.SignIn.Verify(s => s.SignInAsync(It.IsAny<User>(), It.IsAny<bool>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task NewGoogleIdentity_CreatesVerifiedAccountAndStoresExternalLogin()
    {
        var h = new Harness(Info());
        var result = Assert.IsType<RedirectResult>(await h.Controller.GoogleCallback());
        Assert.EndsWith("/auth/callback?newAccount=1", result.Url);
        h.Users.Verify(u => u.CreateAsync(It.Is<User>(user => user.EmailConfirmed && user.Email == "google@example.test" && user.FirstName == "Google")), Times.Once);
        h.Users.Verify(u => u.AddLoginAsync(It.IsAny<User>(), It.Is<UserLoginInfo>(i => i.ProviderKey == "stable-google-id")), Times.Once);
    }

    [Fact]
    public async Task FailedLink_DoesNotSignInAndRemovesIncompleteNewAccount()
    {
        var h = new Harness(Info());
        h.Users.Setup(u => u.AddLoginAsync(It.IsAny<User>(), It.IsAny<UserLoginInfo>()))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Code = "LoginAlreadyAssociated" }));
        var result = Assert.IsType<RedirectResult>(await h.Controller.GoogleCallback());
        Assert.EndsWith("/login?error=link-failed", result.Url);
        h.Users.Verify(u => u.DeleteAsync(It.IsAny<User>()), Times.Once);
        h.SignIn.Verify(s => s.SignInAsync(It.IsAny<User>(), It.IsAny<bool>(), It.IsAny<string>()), Times.Never);
    }
}
