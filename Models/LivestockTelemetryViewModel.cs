using System.Collections.Generic;

namespace YeniKlasor.Models
{
    public class LivestockTelemetryViewModel
    {
        public AnimalInfoModel Animal { get; set; } = new();
        public WeightMetricModel Weight { get; set; } = new();
        public BiomechanicalRiskModel Risk { get; set; } = new();
        public KinesiologyEventsModel Kinesiology { get; set; } = new();
        public LegLoadDistributionModel LegLoads { get; set; } = new();
        public List<DiagnosticAlarmModel> Diagnostics { get; set; } = new();
        public Esp32StatusModel DeviceStatus { get; set; } = new();
        public HistoricalBaselineModel Baseline { get; set; } = new();
        public List<TelemetrySampleModel> TelemetryStream { get; set; } = new();
    }

    public class AnimalInfoModel
    {
        public string RfidTag { get; set; } = "TR-34-8902";
        public string Breed { get; set; } = "Siyah Alaca";
        public int Age { get; set; } = 4;
        public string StatusText { get; set; } = "KAYITTA (03:45 dk)";
        public bool IsActiveRecording { get; set; } = true;
    }

    public class WeightMetricModel
    {
        public double CurrentWeightKg { get; set; } = 482.40;
        public double LiveDeltaKg { get; set; } = 0.3;
        public string FluctuationText { get; set; } = "±0.3kg canlı değişim";
        public bool IsOptimal { get; set; } = true;
    }

    public class BiomechanicalRiskModel
    {
        public int Score { get; set; } = 74;
        public int MaxScore { get; set; } = 100;
        public string RiskLevel { get; set; } = "ORTA RİSK";
        public string RiskBadgeClass { get; set; } = "bg-warning-amber/10 text-warning-amber border-warning-amber/30";
    }

    public class KinesiologyEventsModel
    {
        public int StepCount { get; set; } = 3;
        public int KickLiftCount { get; set; } = 1;
    }

    public class LegLoadDistributionModel
    {
        // Front Left (FL)
        public double FrontLeftWeightKg { get; set; } = 132.5;
        public double FrontLeftPercentage { get; set; } = 27.5;

        // Front Right (FR)
        public double FrontRightWeightKg { get; set; } = 131.0;
        public double FrontRightPercentage { get; set; } = 27.1;

        // Back Left (BL)
        public double BackLeftWeightKg { get; set; } = 108.2;
        public double BackLeftPercentage { get; set; } = 22.4;
        public bool IsBackLeftLightLeg { get; set; } = true;

        // Back Right (BR)
        public double BackRightWeightKg { get; set; } = 110.7;
        public double BackRightPercentage { get; set; } = 23.0;

        // Balance Ratios
        public double FrontTotalPercentage { get; set; } = 54.6;
        public double BackTotalPercentage { get; set; } = 45.4;
        public string AlignmentStatus { get; set; } = "✓ Optimal Hizalama Aralığı";
    }

    public class DiagnosticAlarmModel
    {
        public string MetricName { get; set; } = string.Empty;
        public string StatusText { get; set; } = string.Empty;
        public string ValueText { get; set; } = string.Empty;
        public bool IsAlarm { get; set; } = false;
        public string BadgeClass => IsAlarm
            ? "bg-alarm-rose/10 text-alarm-rose border border-alarm-rose/30 animate-pulse"
            : "bg-primary/10 text-primary border border-primary/20";
        public string RowClass => IsAlarm
            ? "bg-alarm-rose/5 hover:bg-alarm-rose/10 transition-colors border-l-2 border-l-alarm-rose"
            : "border-b border-surface-border/50 hover:bg-surface-container/30 transition-colors";
    }

    public class Esp32StatusModel
    {
        public bool IsConnected { get; set; } = true;
        public string FrequencyText { get; set; } = "10 Hz Veri Akışı";
        public int LatencyMs { get; set; } = 42;
        public string StationName { get; set; } = "/ Süt Sağım Tartı İstasyonu #01";
        public string FarmName { get; set; } = "Marmara Süt Çiftliği - Ahır A";
        public string EventTag { get; set; } = "TEKNOFEST 2026 İnovasyon";
    }

    public class HistoricalBaselineModel
    {
        public string BaselinePolygonPoints { get; set; } = "50,40 70,40 60,70 40,70 35,45";
        public string CurrentPolygonPoints { get; set; } = "50,20 85,30 70,80 30,80 15,35";
    }

    public class TelemetrySampleModel
    {
        public int SampleIndex { get; set; }
        public double FL { get; set; }
        public double FR { get; set; }
        public double BL { get; set; }
        public double BR { get; set; }
        public string? EventType { get; set; } // "STEP", "KICK", null
    }
}
