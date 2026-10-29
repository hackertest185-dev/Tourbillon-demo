using System.Security.Claims;
using backend.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace backend.Tests.Controllers;

public class AdminMfaMiddlewareTests
{
    [Theory]
    [InlineData("POST", "/api/admin/brands")]
    [InlineData("PUT", "/api/admin/watches/1")]
    [InlineData("POST", "/api/watch")]
    [InlineData("PUT", "/api/watch/1")]
    [InlineData("DELETE", "/api/watch/1")]
    [InlineData("POST", "/api/brand")]
    [InlineData("DELETE", "/api/collection/1")]
    public async Task AdministratorWithoutSecondFactorCannotMutateEitherCatalogueApi(string method, string path)
    {
        var context = Context(method, path, verified: false);
        var reachedController = false;
        await Middleware(_ => { reachedController = true; return Task.CompletedTask; }).InvokeAsync(context);
        Assert.Equal(428, context.Response.StatusCode);
        Assert.False(reachedController);
    }

    [Theory]
    [InlineData("POST", "/api/admin/brands", true)]
    [InlineData("DELETE", "/api/watch/1", true)]
    [InlineData("GET", "/api/admin/watches", false)]
    [InlineData("POST", "/api/authentication/mfa/setup", false)]
    [InlineData("POST", "/api/profile/change-password", false)]
    [InlineData("POST", "/api/watch/find", false)]
    [InlineData("POST", "/api/watch/find/", false)]
    public async Task VerifiedWritesAndNonCatalogueRequestsRemainAvailable(string method, string path, bool verified)
    {
        var reachedController = false;
        await Middleware(_ => { reachedController = true; return Task.CompletedTask; })
            .InvokeAsync(Context(method, path, verified));
        Assert.True(reachedController);
    }

    private static AdminMfaMiddleware Middleware(RequestDelegate next) => new(next,
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AdminSecurity:RequireMfaForWrites"] = "true"
        }).Build());

    private static DefaultHttpContext Context(string method, string path, bool verified)
    {
        var context = new DefaultHttpContext();
        context.Request.Method = method;
        context.Request.Path = path;
        context.Response.Body = new MemoryStream();
        var claims = new List<Claim> { new(ClaimTypes.Role, "Admin") };
        if (verified) claims.Add(new Claim("mfa", "true"));
        context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "test-cookie"));
        return context;
    }
}
