using System.Security.Claims;
using backend.Controllers;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using SignInResult = Microsoft.AspNetCore.Identity.SignInResult;

namespace backend.Tests.Controllers;

public class GoogleAuthenticationTests
{
    private sealed class Harness
    {
        public Mock<UserManager<User>> Users { get; } = new(new Mock<IUserStore<User>>().Object,
            null!, null!, null!, null!, null!, null!, null!, null!);
        public Mock<SignInManager<User>> SignIn { get; }
        public AuthenticationController Controller { get; }
        public Mock<IAuthenticationService> Authentication { get; } = new();

        public Harness(ExternalLoginInfo? info)
        {
            var schemes = Mock.Of<IAuthenticationSchemeProvider>();
            SignIn = new Mock<SignInManager<User>>(Users.Object,
                new HttpContextAccessor { HttpContext = new DefaultHttpContext() },
                Mock.Of<IUserClaimsPrincipalFactory<User>>(), Options.Create(new IdentityOptions()),
                NullLogger<SignInManager<User>>.Instance, schemes, Mock.Of<IUserConfirmation<User>>());
            SignIn.Setup(s => s.GetExternalLoginInfoAsync(It.IsAny<string>())).ReturnsAsync(info);
            SignIn.Setup(s => s.SignInAsync(It.IsAny<User>(), It.IsAny<bool>(), It.IsAny<string>())).Returns(Task.CompletedTask);
            SignIn.Setup(s => s.CheckPasswordSignInAsync(It.IsAny<User>(), It.IsAny<string>(), true)).ReturnsAsync(SignInResult.Success);
            SignIn.Setup(s => s.SignInWithClaimsAsync(It.IsAny<User>(), It.IsAny<bool>(), It.IsAny<IEnumerable<Claim>>())).Returns(Task.CompletedTask);
            Users.Setup(u => u.HasPasswordAsync(It.IsAny<User>())).ReturnsAsync(true);
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
            Authentication.Setup(a => a.SignOutAsync(It.IsAny<HttpContext>(), It.IsAny<string>(), It.IsAny<AuthenticationProperties>()))
                .Returns(Task.CompletedTask);
            Controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    RequestServices = new ServiceCollection().AddSingleton(Authentication.Object).BuildServiceProvider()
                }
            };
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
        Assert.EndsWith("/auth/link-google", result.Url);
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

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LinkRequiresAnUnexpiredVerifiedGoogleCookie(bool expired)
    {
        var h = new Harness(expired ? null : Info(verified: false));
        Assert.IsType<BadRequestObjectResult>(await h.Controller.LinkGoogleAccount(new("password")));
        h.Users.Verify(u => u.FindByEmailAsync(It.IsAny<string>()), Times.Never);
        h.Users.Verify(u => u.AddLoginAsync(It.IsAny<User>(), It.IsAny<UserLoginInfo>()), Times.Never);
    }

    [Fact]
    public async Task WrongLocalPasswordCannotLinkVerifiedGoogleIdentity()
    {
        var h = ExistingAccount();
        h.SignIn.Setup(s => s.CheckPasswordSignInAsync(It.IsAny<User>(), It.IsAny<string>(), true)).ReturnsAsync(SignInResult.Failed);
        Assert.IsType<UnauthorizedObjectResult>(await h.Controller.LinkGoogleAccount(new("wrong-password")));
        h.Users.Verify(u => u.AddLoginAsync(It.IsAny<User>(), It.IsAny<UserLoginInfo>()), Times.Never);
    }

    [Fact]
    public async Task CorrectPasswordLinksOnlyTheAccountFromTheVerifiedGoogleEmailAndConsumesExternalCookie()
    {
        var h = ExistingAccount();
        Assert.IsType<OkObjectResult>(await h.Controller.LinkGoogleAccount(new("correct-password")));
        h.Users.Verify(u => u.AddLoginAsync(It.Is<User>(user => user.Id == 9),
            It.Is<UserLoginInfo>(login => login.LoginProvider == "Google" && login.ProviderKey == "stable-google-id")), Times.Once);
        h.SignIn.Verify(s => s.SignInAsync(It.Is<User>(user => user.Id == 9), false, null), Times.Once);
        h.Authentication.Verify(a => a.SignOutAsync(It.IsAny<HttpContext>(), IdentityConstants.ExternalScheme, null), Times.Once);
    }

    [Fact]
    public async Task ALinkedProviderKeyCannotBeReplayedOrMovedToAnotherAccount()
    {
        var h = ExistingAccount();
        h.Users.Setup(u => u.FindByLoginAsync("Google", "stable-google-id")).ReturnsAsync(new User { Id = 12 });
        Assert.IsType<BadRequestObjectResult>(await h.Controller.LinkGoogleAccount(new("correct-password")));
        h.Users.Verify(u => u.AddLoginAsync(It.IsAny<User>(), It.IsAny<UserLoginInfo>()), Times.Never);
        h.SignIn.Verify(s => s.SignInAsync(It.IsAny<User>(), It.IsAny<bool>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task AnAccountWithMfaCannotLinkUsingPasswordAlone()
    {
        var h = ExistingAccount(mfa: true);
        var response = Assert.IsType<OkObjectResult>(await h.Controller.LinkGoogleAccount(new("correct-password")));
        Assert.Contains("\"requiresMfa\":true", System.Text.Json.JsonSerializer.Serialize(response.Value));
        h.Users.Verify(u => u.AddLoginAsync(It.IsAny<User>(), It.IsAny<UserLoginInfo>()), Times.Never);
        h.SignIn.Verify(s => s.SignInAsync(It.IsAny<User>(), It.IsAny<bool>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task WrongSecondFactorCannotLinkAnAccount()
    {
        var h = ExistingAccount(mfa: true);
        Assert.IsType<UnauthorizedObjectResult>(await h.Controller.LinkGoogleAccount(new("correct-password", "000000")));
        h.Users.Verify(u => u.AddLoginAsync(It.IsAny<User>(), It.IsAny<UserLoginInfo>()), Times.Never);
    }

    [Fact]
    public async Task CorrectSecondFactorRetainsVerifiedProofAfterLinking()
    {
        var h = ExistingAccount(mfa: true);
        h.Users.Setup(u => u.VerifyTwoFactorTokenAsync(It.IsAny<User>(), TokenOptions.DefaultAuthenticatorProvider, "123456"))
            .ReturnsAsync(true);
        Assert.IsType<OkObjectResult>(await h.Controller.LinkGoogleAccount(new("correct-password", "123456")));
        h.SignIn.Verify(s => s.SignInWithClaimsAsync(It.Is<User>(user => user.Id == 9), false,
            It.Is<IEnumerable<Claim>>(claims => claims.Any(c => c.Type == "mfa" && c.Value == "true"))), Times.Once);
    }

    private static Harness ExistingAccount(bool mfa = false)
    {
        var h = new Harness(Info());
        h.Users.Setup(u => u.FindByEmailAsync("google@example.test"))
            .ReturnsAsync(new User { Id = 9, Email = "google@example.test" });
        h.Users.Setup(u => u.GetTwoFactorEnabledAsync(It.IsAny<User>())).ReturnsAsync(mfa);
        return h;
    }
}
