"""
Realistic mock data representing one month of Pohjoinen marketing performance.
Replace each function with a real API call to go live.
"""

from datetime import date


REPORT_PERIOD = "May 2025"
PREV_PERIOD = "April 2025"


def get_ga4_data() -> dict:
    """Simulates GA4 Data API response."""
    return {
        "source": "Google Analytics 4",
        "period": REPORT_PERIOD,
        "sessions": 48_320,
        "sessions_prev": 41_100,
        "organic_sessions": 22_400,
        "organic_sessions_prev": 17_800,
        "revenue": 187_450,
        "revenue_prev": 159_200,
        "transactions": 1_243,
        "transactions_prev": 1_087,
        "avg_order_value": 150.8,
        "avg_order_value_prev": 146.5,
        "conversion_rate": 2.57,
        "conversion_rate_prev": 2.64,
        "top_landing_pages": [
            {"page": "/vaelluskengat", "sessions": 4_210, "revenue": 18_900},
            {"page": "/teltat", "sessions": 3_640, "revenue": 24_500},
            {"page": "/juoksukengat", "sessions": 2_980, "revenue": 11_200},
        ],
        "channel_breakdown": {
            "Organic Search": {"sessions": 22_400, "revenue": 89_600},
            "Paid Search": {"sessions": 12_100, "revenue": 58_200},
            "Email": {"sessions": 7_800, "revenue": 28_400},
            "Social": {"sessions": 4_200, "revenue": 8_900},
            "Direct": {"sessions": 1_820, "revenue": 2_350},
        },
    }


def get_google_ads_data() -> dict:
    """Simulates Google Ads API response."""
    return {
        "source": "Google Ads",
        "period": REPORT_PERIOD,
        "spend": 9_840,
        "spend_prev": 8_200,
        "impressions": 412_000,
        "clicks": 14_200,
        "ctr": 3.45,
        "ctr_prev": 3.21,
        "avg_cpc": 0.69,
        "avg_cpc_prev": 0.74,
        "conversions": 387,
        "conversions_prev": 301,
        "revenue": 58_200,
        "revenue_prev": 44_100,
        "roas": 5.92,
        "roas_prev": 5.38,
        "top_campaigns": [
            {"name": "Brand – Exact", "spend": 1_200, "roas": 14.2, "conversions": 98},
            {"name": "Vaellus – Generic", "spend": 3_400, "roas": 6.1, "conversions": 142},
            {"name": "Juoksu – Generic", "spend": 2_800, "roas": 4.8, "conversions": 89},
            {"name": "Retargeting", "spend": 2_440, "roas": 3.9, "conversions": 58},
        ],
    }


def get_meta_ads_data() -> dict:
    """Simulates Meta Ads Manager API response."""
    return {
        "source": "Meta Ads",
        "period": REPORT_PERIOD,
        "spend": 4_120,
        "spend_prev": 4_600,
        "impressions": 890_000,
        "reach": 310_000,
        "clicks": 9_800,
        "ctr": 1.10,
        "ctr_prev": 0.98,
        "cpm": 4.63,
        "cpm_prev": 5.12,
        "conversions": 148,
        "conversions_prev": 141,
        "revenue": 19_400,
        "revenue_prev": 18_200,
        "roas": 4.71,
        "roas_prev": 3.96,
        "top_adsets": [
            {"name": "Lookalike 1% – Buyers", "spend": 1_600, "roas": 6.2},
            {"name": "Retargeting – 30d", "spend": 980, "roas": 7.8},
            {"name": "Interest – Outdoor", "spend": 1_540, "roas": 2.1},
        ],
        "note": "Spend reduced MoM due to creative fatigue on interest-based sets.",
    }


def get_klaviyo_data() -> dict:
    """Simulates Klaviyo API response."""
    return {
        "source": "Klaviyo",
        "period": REPORT_PERIOD,
        "total_subscribers": 181_400,
        "total_subscribers_prev": 178_900,
        "new_subscribers": 2_800,
        "unsubscribes": 310,
        "campaigns_sent": 4,
        "emails_delivered": 692_000,
        "avg_open_rate": 28.4,
        "avg_open_rate_prev": 26.1,
        "avg_click_rate": 4.2,
        "avg_click_rate_prev": 3.8,
        "revenue_attributed": 28_400,
        "revenue_attributed_prev": 21_600,
        "revenue_per_email": 0.041,
        "campaigns": [
            {
                "name": "Kevätalennus – kaikki",
                "sent": 181_000,
                "open_rate": 24.1,
                "click_rate": 3.2,
                "revenue": 5_200,
            },
            {
                "name": "Vaelluskengät – ostajat",
                "sent": 12_400,
                "open_rate": 41.8,
                "click_rate": 8.9,
                "revenue": 11_400,
            },
            {
                "name": "Teltat & retkeilytarvikkeet",
                "sent": 38_000,
                "open_rate": 33.2,
                "click_rate": 6.1,
                "revenue": 8_200,
            },
            {
                "name": "Win-back – 180 pv",
                "sent": 14_200,
                "open_rate": 19.4,
                "click_rate": 2.1,
                "revenue": 3_600,
            },
        ],
        "flows_revenue": 9_800,
    }


def get_all_data() -> dict:
    return {
        "period": REPORT_PERIOD,
        "prev_period": PREV_PERIOD,
        "ga4": get_ga4_data(),
        "google_ads": get_google_ads_data(),
        "meta_ads": get_meta_ads_data(),
        "klaviyo": get_klaviyo_data(),
    }
