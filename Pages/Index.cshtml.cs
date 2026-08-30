using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using YeniKlasor.Models;

namespace YeniKlasor.Pages
{
    public class IndexModel : PageModel
    {
        [BindProperty]
        public LivestockTelemetryViewModel DashboardData { get; set; } = new();

        [TempData]
        public string? SuccessMessage { get; set; }

        public void OnGet()
        {
            InitializeDashboardData();
        }

        /// <summary>
        /// Handles CSV export of live telemetry data.
        /// </summary>
        public IActionResult OnPostExportData()
        {
            var csv = new StringBuilder();
            csv.AppendLine("ZamanDamgasi,RFID,CanliAgirlik_kg,FL_kg,FR_kg,BL_kg,BR_kg,RiskSkoru,AdimSayisi,TekmeSayisi,AlarmDurumu");
            csv.AppendLine($"{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss},TR-34-8902,482.40,132.5,131.0,108.2,110.7,74,3,1,Yuk Kaymasi");

            var bytes = Encoding.UTF8.GetBytes(csv.ToString());
            var output = new MemoryStream(bytes);
            return File(output, "text/csv", $"INGEK_Telemetri_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv");
        }

        /// <summary>
        /// API endpoint for real-time AJAX stream polling if needed.
        /// </summary>
        public IActionResult OnGetStreamData()
        {
            var random = new Random();
            var fl = Math.Round(132.0 + random.NextDouble() * 1.5, 1);
            var fr = Math.Round(130.5 + random.NextDouble() * 1.5, 1);
            var bl = Math.Round(107.5 + random.NextDouble() * 1.5, 1);
            var br = Math.Round(110.0 + random.NextDouble() * 1.5, 1);
            var total = Math.Round(fl + fr + bl + br, 2);

            return new JsonResult(new
            {
                timestamp = DateTime.UtcNow.ToString("HH:mm:ss.fff"),
                totalWeight = total,
                fl = fl,
                fr = fr,
                bl = bl,
                br = br,
                latency = random.Next(38, 48),
                stepCount = 3,
                kickCount = 1
            });
        }

        private void InitializeDashboardData()
        {
            DashboardData = new LivestockTelemetryViewModel
            {
                Animal = new AnimalInfoModel
                {
                    RfidTag = "TR-34-8902",
                    Breed = "Siyah Alaca",
                    Age = 4,
                    StatusText = "KAYITTA (03:45 dk)",
                    IsActiveRecording = true
                },
                Weight = new WeightMetricModel
                {
                    CurrentWeightKg = 482.40,
                    LiveDeltaKg = 0.3,
                    FluctuationText = "±0.3kg canlı değişim",
                    IsOptimal = true
                },
                Risk = new BiomechanicalRiskModel
                {
                    Score = 74,
                    MaxScore = 100,
                    RiskLevel = "ORTA RİSK",
                    RiskBadgeClass = "bg-warning-amber/10 text-warning-amber border-warning-amber/30"
                },
                Kinesiology = new KinesiologyEventsModel
                {
                    StepCount = 3,
                    KickLiftCount = 1
                },
                LegLoads = new LegLoadDistributionModel
                {
                    FrontLeftWeightKg = 132.5,
                    FrontLeftPercentage = 27.5,

                    FrontRightWeightKg = 131.0,
                    FrontRightPercentage = 27.1,

                    BackLeftWeightKg = 108.2,
                    BackLeftPercentage = 22.4,
                    IsBackLeftLightLeg = true,

                    BackRightWeightKg = 110.7,
                    BackRightPercentage = 23.0,

                    FrontTotalPercentage = 54.6,
                    BackTotalPercentage = 45.4,
                    AlignmentStatus = "✓ Optimal Hizalama Aralığı"
                },
                Diagnostics = new List<DiagnosticAlarmModel>
                {
                    new()
                    {
                        MetricName = "Yük Asimetrisi",
                        StatusText = "TEMİZ",
                        ValueText = "0.97",
                        IsAlarm = false
                    },
                    new()
                    {
                        MetricName = "Ağırlık Farkı",
                        StatusText = "TEMİZ",
                        ValueText = "2.5kg",
                        IsAlarm = false
                    },
                    new()
                    {
                        MetricName = "Yük Kayması",
                        StatusText = "ALARM TETİKLENDİ",
                        ValueText = "24.1kg",
                        IsAlarm = true
                    }
                },
                DeviceStatus = new Esp32StatusModel
                {
                    IsConnected = true,
                    FrequencyText = "10 Hz Veri Akışı",
                    LatencyMs = 42,
                    StationName = "/ Süt Sağım Tartı İstasyonu #01",
                    FarmName = "Marmara Süt Çiftliği - Ahır A",
                    EventTag = "TEKNOFEST 2026 İnovasyon"
                },
                Baseline = new HistoricalBaselineModel
                {
                    BaselinePolygonPoints = "50,40 70,40 60,70 40,70 35,45",
                    CurrentPolygonPoints = "50,20 85,30 70,80 30,80 15,35"
                }
            };
        }
    }
}
