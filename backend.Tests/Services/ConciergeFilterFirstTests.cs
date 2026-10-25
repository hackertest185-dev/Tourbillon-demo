// The concierge answers a brief with constraints by filtering the catalogue first and ranking what is
// left by meaning. On the dev set 88% of open-ended briefs used to take a catalogue path ordered by
// hand-set points, so the brief's meaning never reached the order of the cards.
using backend.Database;
using backend.Models;
using backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace backend.Tests.Services;

public class ConciergeFilterFirstTests
{
    private static readonly IStorageService Storage = new TestStorageService();

    private sealed class FixedLexicalSearch(params int[] ids) : ILexicalWatchSearch
    {
        public Task<IReadOnlyList<Bm25Hit>> SearchAsync(string query, int limit, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Bm25Hit>>(ids.Select((id, i) => new Bm25Hit(id, 10.0 - i)).Take(limit).ToList());
    }

    // Every ai-service call fails, so there is no embedding and BM25F is the only ranker; the vector
    // half needs pgvector, which the in-memory provider does not have.
    private sealed class UnavailableAiService : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.ServiceUnavailable));
    }

    private static TourbillonContext SeededContext()
    {
        var options = new DbContextOptionsBuilder<TourbillonContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var context = new TestTourbillonContext(options);
        context.Brands.Add(new Brand { Id = 1, Name = "Omega", Slug = "omega" });
        context.Watches.AddRange(
            new Watch { Id = 1, Name = "A1", Slug = "a1", BrandId = 1, CurrentPrice = 4_000 },
            new Watch { Id = 2, Name = "A2", Slug = "a2", BrandId = 1, CurrentPrice = 0 },
            new Watch { Id = 3, Name = "A3", Slug = "a3", BrandId = 1, CurrentPrice = 50_000 },
            new Watch { Id = 4, Name = "A4", Slug = "a4", BrandId = 1, CurrentPrice = 6_000 },
            new Watch { Id = 5, Name = "A5", Slug = "a5", BrandId = 1, CurrentPrice = 9_000 });
        context.SaveChanges();
        return context;
    }

    private static (WatchFinderService Service, Mock<IDeterministicWatchSearchService> Deterministic) CreateService(
        TourbillonContext context, ILexicalWatchSearch lexical, bool filterFirst = true)
    {
        var httpFactory = new Mock<IHttpClientFactory>();
        httpFactory.Setup(f => f.CreateClient("ai-service"))
            .Returns(() => new HttpClient(new UnavailableAiService()) { BaseAddress = new Uri("http://ai-service:5000") });
        var deterministic = new Mock<IDeterministicWatchSearchService>();
        deterministic
            .Setup(s => s.TryDirectSqlSearchAsync(It.IsAny<string>(), It.IsAny<QueryIntent?>(), It.IsAny<string>()))
            .ReturnsAsync((string _, QueryIntent? intent, string path) => new WatchFinderResult { QueryIntent = intent, SearchPath = path });
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["WatchFinderSettings:ConciergeFilterFirst"] = filterFirst ? "true" : "false",
            })
            .Build();

        var service = new WatchFinderService(
            httpFactory.Object,
            deterministic.Object,
            context,
            new WatchFilterMapper(),
            new QueryCacheService(context, NullLogger<QueryCacheService>.Instance),
            NullLogger<WatchFinderService>.Instance,
            Storage,
            config,
            lexical: lexical);
        return (service, deterministic);
    }

    [Fact]
    public async Task A_constrained_brief_is_ranked_by_meaning_inside_the_filter()
    {
        using var context = SeededContext();
        // BM25F likes 3 best, but it is over budget; inside the budget its order is 5, 4, 1, which is
        // neither cheapest-first nor id order.
        var (service, _) = CreateService(context, new FixedLexicalSearch(3, 5, 4, 1));

        var result = await service.FindWatchesAsync("something elegant for a wedding under 10k");

        Assert.Equal("filter_fuse", result.SearchPath);
        Assert.Equal([5, 4, 1], result.Watches.Select(w => w.Id));
    }

    [Fact]
    public async Task Filtering_is_done_before_ranking_so_a_watch_no_ranker_matched_still_counts()
    {
        using var context = SeededContext();
        var (service, _) = CreateService(context, new FixedLexicalSearch(5));

        var result = await service.FindWatchesAsync("something elegant for a wedding under 10k");

        // 5 is the only one BM25F matched, so it leads; 1 and 4 satisfy the brief too, and follow.
        Assert.Equal(5, result.Watches[0].Id);
        Assert.Equal([1, 4, 5], result.Watches.Select(w => w.Id).Order());
    }

    [Fact]
    public async Task The_catalogue_path_is_not_asked_when_the_filter_answers()
    {
        using var context = SeededContext();
        var (service, deterministic) = CreateService(context, new FixedLexicalSearch(5, 4, 1));

        await service.FindWatchesAsync("something elegant for a wedding under 10k");

        deterministic.Verify(
            s => s.TryDirectSqlSearchAsync(It.IsAny<string>(), It.IsAny<QueryIntent?>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task A_brief_nothing_satisfies_falls_through_to_the_catalogue_path()
    {
        using var context = SeededContext();
        var (service, _) = CreateService(context, new FixedLexicalSearch(5, 4, 1));

        var result = await service.FindWatchesAsync("something elegant for a wedding under 1k");

        Assert.Equal("direct_sql_deterministic", result.SearchPath);
    }

    [Fact]
    public async Task Switched_off_the_old_catalogue_path_answers()
    {
        using var context = SeededContext();
        var (service, _) = CreateService(context, new FixedLexicalSearch(5, 4, 1), filterFirst: false);

        var result = await service.FindWatchesAsync("something elegant for a wedding under 10k");

        Assert.Equal("direct_sql_deterministic", result.SearchPath);
    }
}
