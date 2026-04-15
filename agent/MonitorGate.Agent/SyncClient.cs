using System.IO.Compression;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

public sealed class SyncClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly HttpClient _httpClient;

    public SyncClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<bool> SendBatchAsync(
        string apiBaseUrl,
        string token,
        string userId,
        IEnumerable<ActivitySample> activities,
        bool sendFullUrl,
        CancellationToken cancellationToken
    )
    {
        var payload = new
        {
            userId,
            activities = activities.Select(a => new
            {
                sessionId = a.SessionId,
                appName = a.AppName,
                processName = a.ProcessName,
                windowTitle = a.WindowTitle,
                url = sendFullUrl ? a.Url : null,
                urlDomain = a.UrlDomain,
                startUtc = a.StartUtc,
                endUtc = a.EndUtc,
                durationMs = a.DurationMs
            })
        };

        string json = JsonSerializer.Serialize(payload, JsonOptions);
        byte[] raw = Encoding.UTF8.GetBytes(json);
        byte[] compressed = Compress(raw);

        using HttpRequestMessage request = new(HttpMethod.Post, $"{apiBaseUrl.TrimEnd('/')}/api/activity");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("X-Client", "monitor-gate-agent");

        ByteArrayContent content = new(compressed);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        content.Headers.ContentEncoding.Add("gzip");
        request.Content = content;

        using HttpResponseMessage response = await _httpClient.SendAsync(request, cancellationToken);
        return response.IsSuccessStatusCode;
    }

    private static byte[] Compress(byte[] input)
    {
        using MemoryStream output = new();
        using (GZipStream gzip = new(output, CompressionLevel.Fastest, leaveOpen: true))
        {
            gzip.Write(input, 0, input.Length);
        }

        return output.ToArray();
    }
}
