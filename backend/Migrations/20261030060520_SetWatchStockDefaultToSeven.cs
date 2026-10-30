using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class SetWatchStockDefaultToSeven : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "StockQuantity",
                table: "Watches",
                type: "integer",
                nullable: false,
                defaultValue: 7,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.Sql("UPDATE \"Watches\" SET \"StockQuantity\" = 7;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "StockQuantity",
                table: "Watches",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 7);
        }
    }
}
