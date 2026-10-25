// One turn of concierge history as it is kept in Redis (key: chat:session:{id}, 1-hour TTL).
// Sessions have no table; ChatService serialises a list of these per session.
namespace backend.Models;

public class ChatMessage
{
    public string Role { get; set; } = "";    // "user" | "assistant"
    public string Content { get; set; } = "";
}
