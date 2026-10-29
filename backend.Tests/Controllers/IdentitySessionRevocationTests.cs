using System.Security.Claims;
using System.Text.Encodings.Web;
using backend.Database;
using backend.Models;
using backend.Services;
using backend.Tests.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace backend.Tests.Controllers;

public class IdentitySessionRevocationTests
{
    [Theory]
    [InlineData("change")]
    [InlineData("reset")]
    [InlineData("delete")]
    [InlineData("unchanged")]
    public async Task RealIdentityCookiesRevokeImmediatelyAndKeepMfaOnlyWhileTheSessionRemainsValid(string action)
    {
        using var database = TestContextFactory.Create();
        var registrations = new ServiceCollection();
        registrations.AddLogging();
        registrations.AddSingleton(UrlEncoder.Default);
        registrations.AddDataProtection().UseEphemeralDataProtectionProvider();
        registrations.AddSingleton<TourbillonContext>(database);
        registrations.AddIdentity<User, IdentityRole<int>>()
            .AddEntityFrameworkStores<TourbillonContext>().AddDefaultTokenProviders();
        registrations.Configure<SecurityStampValidatorOptions>(options =>
        {
            options.ValidationInterval = TimeSpan.Zero;
            options.OnRefreshingPrincipal = AdminMfaSessionClaims.PreserveOnValidatedRefresh;
        });
        using var services = registrations.BuildServiceProvider();
        using var initialScope = services.CreateScope();
        var manager = initialScope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var roles = initialScope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();
        var user = new User { UserName = "qa@example.test", Email = "qa@example.test", FirstName = "QA", LastName = "Test" };
        Assert.True((await manager.CreateAsync(user, "Original!Password123")).Succeeded);
        Assert.True((await roles.CreateAsync(new IdentityRole<int>("Admin"))).Succeeded);
        Assert.True((await manager.AddToRoleAsync(user, "Admin")).Succeeded);
        var login = Request(initialScope.ServiceProvider);
        initialScope.ServiceProvider.GetRequiredService<IHttpContextAccessor>().HttpContext = login;
        await initialScope.ServiceProvider.GetRequiredService<SignInManager<User>>()
            .SignInWithClaimsAsync(user, false, new[] { new Claim("mfa", "true") });
        var oldCookie = string.Join("; ", login.Response.Headers.SetCookie.Select(cookie => cookie!.Split(';')[0]));

        if (action == "change")
            Assert.True((await manager.ChangePasswordAsync(user, "Original!Password123", "Replacement!Password123")).Succeeded);
        else if (action == "reset")
        {
            var token = await manager.GeneratePasswordResetTokenAsync(user);
            Assert.True((await manager.ResetPasswordAsync(user, token, "Replacement!Password123")).Succeeded);
        }
        else if (action == "delete") Assert.True((await manager.DeleteAsync(user)).Succeeded);

        using var requestScope = services.CreateScope();
        var replay = Request(requestScope.ServiceProvider);
        replay.Request.Headers.Cookie = oldCookie;
        requestScope.ServiceProvider.GetRequiredService<IHttpContextAccessor>().HttpContext = replay;
        var authentication = await replay.AuthenticateAsync(IdentityConstants.ApplicationScheme);
        Assert.Equal(action == "unchanged", authentication.Succeeded);
        if (action == "unchanged")
        {
            Assert.True(authentication.Principal!.IsInRole("Admin"));
            Assert.True(authentication.Principal.HasClaim("mfa", "true"));
        }
    }

    private static DefaultHttpContext Request(IServiceProvider services)
    {
        var context = new DefaultHttpContext { RequestServices = services };
        context.Request.Scheme = "https";
        context.Request.Host = new HostString("velora-five-umber.vercel.app");
        context.Request.Path = "/api/profile/me";
        context.Response.Body = new MemoryStream();
        return context;
    }
}
