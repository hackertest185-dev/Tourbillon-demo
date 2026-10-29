using System.Net;
using System.Text;
using System.Text.Encodings.Web;
using backend.Middleware;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace backend.Tests.Controllers;

public class PublicGoogleProxyFlowTests
{
    private const string PublicOrigin = "https://velora-five-umber.vercel.app";

    private static IConfiguration Config(string origin = PublicOrigin) =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AppSettings:FrontendBaseUrl"] = origin
        }).Build();

    private static DefaultHttpContext Request(IServiceProvider services, string path)
    {
        var context = new DefaultHttpContext { RequestServices = services };
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("internal-api:8080");
        context.Request.Path = path;
        context.Response.Body = new MemoryStream();
        return context;
    }

    [Theory]
    [InlineData("/api/authentication/google")]
    [InlineData("/signin-google")]
    [InlineData("/api/authentication/google-callback")]
    public async Task EveryOAuthStageUsesConfigurationRatherThanUntrustedForwardedHost(string path)
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        var context = Request(services, path);
        context.Request.Headers["X-Forwarded-Host"] = "attacker.example";
        await new PublicOAuthOriginMiddleware(_ => Task.CompletedTask, Config()).InvokeAsync(context);
        Assert.Equal("https", context.Request.Scheme);
        Assert.Equal("velora-five-umber.vercel.app", context.Request.Host.Value);
        Assert.Equal(path, context.Request.Path.Value);
    }

    [Fact]
    public async Task OrdinaryApiRequestsKeepTheirOriginalOrigin()
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        var context = Request(services, "/api/watch");
        await new PublicOAuthOriginMiddleware(_ => Task.CompletedTask, Config()).InvokeAsync(context);
        Assert.Equal("http", context.Request.Scheme);
        Assert.Equal("internal-api:8080", context.Request.Host.Value);
    }

    [Fact]
    public async Task RealGoogleHandlerUsesTheSameRedirectUriDuringChallengeAndCodeExchange()
    {
        var backchannel = new GoogleBackchannel();
        var registrations = new ServiceCollection();
        registrations.AddLogging();
        registrations.AddSingleton(UrlEncoder.Default);
        registrations.AddDataProtection().UseEphemeralDataProtectionProvider();
        registrations.AddAuthentication(options => options.DefaultSignInScheme = "External")
            .AddCookie("External")
            .AddGoogle(options =>
            {
                options.ClientId = "test-client";
                options.ClientSecret = "test-secret";
                options.Backchannel = new HttpClient(backchannel);
            });
        using var services = registrations.BuildServiceProvider();
        var challenge = Request(services, "/api/authentication/google");
        await new PublicOAuthOriginMiddleware(async context =>
            await context.ChallengeAsync("Google", new AuthenticationProperties { RedirectUri = "/completed" }),
            Config()).InvokeAsync(challenge);

        var authorization = new Uri(challenge.Response.Headers.Location.ToString());
        var query = QueryHelpers.ParseQuery(authorization.Query);
        var callback = Request(services, "/signin-google");
        callback.Request.QueryString = new QueryString(QueryHelpers.AddQueryString("", new Dictionary<string, string?>
        {
            ["code"] = "test-code",
            ["state"] = query["state"]
        }));
        callback.Request.Headers.Cookie = string.Join("; ", challenge.Response.Headers.SetCookie
            .Select(cookie => cookie!.Split(';')[0]));

        await new PublicOAuthOriginMiddleware(async context =>
        {
            // Each HTTP request gets its own scoped handler provider, just as Kestrel does.
            using var requestScope = services.CreateScope();
            context.RequestServices = requestScope.ServiceProvider;
            var handler = await context.RequestServices.GetRequiredService<IAuthenticationHandlerProvider>()
                .GetHandlerAsync(context, "Google");
            Assert.True(await ((IAuthenticationRequestHandler)handler!).HandleRequestAsync());
        }, Config()).InvokeAsync(callback);

        Assert.Equal(PublicOrigin + "/signin-google", query["redirect_uri"].ToString());
        Assert.Equal(query["redirect_uri"].ToString(), backchannel.RedirectUri);
        Assert.Equal(302, callback.Response.StatusCode);
        Assert.Equal("/completed", callback.Response.Headers.Location.ToString());
        Assert.Contains(callback.Response.Headers.SetCookie, value => value!.StartsWith(".AspNetCore.External="));
    }

    private sealed class GoogleBackchannel : HttpMessageHandler
    {
        public string? RedirectUri { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (request.RequestUri!.AbsoluteUri == GoogleDefaults.TokenEndpoint)
            {
                var body = QueryHelpers.ParseQuery("?" + await request.Content!.ReadAsStringAsync(cancellationToken));
                RedirectUri = body["redirect_uri"].ToString();
                if (RedirectUri != PublicOrigin + "/signin-google")
                    return Json(HttpStatusCode.BadRequest, "{\"error\":\"invalid_grant\"}");
                return Json(HttpStatusCode.OK, "{\"access_token\":\"test-token\",\"token_type\":\"Bearer\"}");
            }

            Assert.Equal(GoogleDefaults.UserInformationEndpoint, request.RequestUri.AbsoluteUri);
            return Json(HttpStatusCode.OK, "{\"sub\":\"test-user\",\"email\":\"test@example.test\",\"email_verified\":true}");
        }

        private static HttpResponseMessage Json(HttpStatusCode status, string body) =>
            new(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
    }
}
