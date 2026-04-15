using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public sealed class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly ActivityRepository _repository;
    private readonly WindowTracker _tracker;
    private readonly SyncClient _syncClient;
    private readonly AgentOptions _options;
    private readonly string _sessionId = Guid.NewGuid().ToString("N");

    public Worker(
        ILogger<Worker> logger,
        IConfiguration configuration,
        ActivityRepository repository,
        WindowTracker tracker,
        SyncClient syncClient)
    {
        _logger = logger;
        _repository = repository;
        _tracker = tracker;
        _syncClient = syncClient;
        _options = configuration.GetSection("Agent").Get<AgentOptions>() ?? new AgentOptions();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MonitorGate Agent iniciado. SessionId={SessionId}", _sessionId);

        TimeSpan pollInterval = TimeSpan.FromMilliseconds(Math.Max(250, _options.PollIntervalMs));
        TimeSpan syncInterval = TimeSpan.FromSeconds(Math.Max(30, _options.SyncIntervalSeconds));
        DateTimeOffset lastSync = DateTimeOffset.UtcNow;

        while (!stoppingToken.IsCancellationRequested)
        {
            ActivitySample? sample = _tracker.Poll(_sessionId, _options.UserId, _options.DeviceName);
            if (sample is not null)
            {
                _repository.Insert(sample);
            }

            if (DateTimeOffset.UtcNow - lastSync >= syncInterval)
            {
                await TrySyncAsync(stoppingToken);
                lastSync = DateTimeOffset.UtcNow;
            }

            await Task.Delay(pollInterval, stoppingToken);
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        ActivitySample? finalSample = _tracker.Flush(_sessionId, _options.UserId, _options.DeviceName);
        if (finalSample is not null)
        {
            _repository.Insert(finalSample);
        }

        await TrySyncAsync(cancellationToken);
        await base.StopAsync(cancellationToken);
    }

    private async Task TrySyncAsync(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiBaseUrl) || string.IsNullOrWhiteSpace(_options.ApiToken))
        {
            return;
        }

        IReadOnlyList<ActivitySample> pending = _repository.GetPending(_options.BatchSize);
        if (pending.Count == 0)
        {
            return;
        }

        try
        {
            bool ok = await _syncClient.SendBatchAsync(
                _options.ApiBaseUrl,
                _options.ApiToken,
                _options.UserId,
                pending,
                _options.SendFullUrl,
                cancellationToken
            );

            if (ok)
            {
                _repository.MarkSynced(pending.Where(x => x.Id.HasValue).Select(x => x.Id!.Value));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha no sync remoto.");
        }
    }
}
