using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using backend.Database;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(TourbillonContext))]
    [Migration("20260321010000_AddWatchEmbeddingsHnswIndex")]
    public partial class AddWatchEmbeddingsHnswIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // HNSW index for approximate nearest-neighbor cosine search on watch embeddings.
            // Turns the vector search from a full sequential scan into sub-10ms ANN lookup.
            // CONCURRENTLY keeps the table readable during index build.
            migrationBuilder.Sql(
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_watch_embeddings_hnsw " +
                "ON \"WatchEmbeddings\" USING hnsw (\"Embedding\" vector_cosine_ops);",
                suppressTransaction: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "DROP INDEX CONCURRENTLY IF EXISTS ix_watch_embeddings_hnsw;",
                suppressTransaction: true
            );
        }
    }
}
