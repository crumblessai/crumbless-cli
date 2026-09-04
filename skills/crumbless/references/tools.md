# Crumbless MCP tools ↔ CLI

All tools take a brand `slug` when brand-scoped. Ids accept short unambiguous prefixes.

## Auth

| MCP | CLI |
|-----|-----|
| `login` | `crumbless login` |
| `logout` | `crumbless logout` |
| `whoami` | (session file / brands imply identity) |
| `list_brands` | `crumbless brands` |

## Brand & posts

| MCP | CLI |
|-----|-----|
| `get_dashboard` | `crumbless dashboard <slug>` |
| `get_status` | `crumbless status <slug>` |
| `get_analytics` | `crumbless analytics <slug>` |
| `get_calendar` | `crumbless calendar <slug> [--month YYYY-MM]` |
| `get_gtm` | `crumbless gtm <slug>` |
| `get_voice` / `update_voice` | `crumbless voice <slug>` |
| `list_products` | (studio / products views) |
| `list_posts` | `crumbless content <slug> [--status …]` |
| `approve_posts` | `crumbless approve <slug> --all` |
| `get_post` | `crumbless post <slug> <id>` |
| `edit_post` | `crumbless post <slug> <id> edit …` |
| `approve_post` / `publish_post` / `reject_post` | `crumbless post <slug> <id> approve\|publish\|reject` |
| `reschedule_post` | `crumbless post <slug> <id> reschedule --scheduledFor …` |
| `render_post` | `crumbless post <slug> <id> render` |
| `regenerate_post_media` | `crumbless post <slug> <id> regenerate --instruction "…"` |
| `regenerate_slide` | `crumbless post <slug> <id> slide --index N --instruction "…"` |
| `reorder_slides` | `crumbless post <slug> <id> reorder --order "0,2,1"` |
| `make_video` | `crumbless post <slug> <id> video …` |

## Plans

| MCP | CLI |
|-----|-----|
| `get_plan` | `crumbless plan <slug>` |
| `propose_plan` / `revise_plan` / `approve_plan` / `discard_plan` | `crumbless plan <slug> propose\|revise\|approve\|discard` |
| `save_brief` / `replan_week` | `crumbless plan <slug> save-brief\|replan --week N …` |
| `get_weekly_plan` | `crumbless weekly-plan <slug>` |
| `plan_week` / `produce_week` | `crumbless weekly-plan <slug> plan\|produce --week N` |

## Studio

| MCP | CLI |
|-----|-----|
| `get_studio` | `crumbless studio <slug>` |
| `update_brand_kit` / `set_colors` | `crumbless studio <slug> kit-update\|colors …` |
| `add_note` / `delete_document` | `crumbless studio <slug> add-note\|delete-doc …` |
| `add_person` / `generate_person` / `delete_person` | `crumbless studio <slug> people-*` |
| `add_competitor` / `delete_competitor` / `research_competitors` | `crumbless studio <slug> add-competitor\|…\|research` |
| `sync_history` | `crumbless studio <slug> sync-history` |

## SEO / GEO / blog / ads / AI

| MCP | CLI |
|-----|-----|
| `get_seo` / `seo_action` | `crumbless seo <slug> [run\|plan\|…]` |
| `get_geo` / `geo_action` | `crumbless geo <slug> [run\|fix]` |
| `get_keywords` / `refresh_keywords` | `crumbless keywords <slug> [refresh]` |
| `list_articles` / `generate_article` / `optimize_article` | `crumbless web <slug> …` |
| `publish_article` / `unpublish_article` / `delete_article` | `crumbless web <slug> publish\|…` |
| `get_ads` / `ads_action` | `crumbless ads <slug> [--propose\|--create\|--approve\|--pause\|--resume\|--duplicate\|--delete\|--reject] [--ad <adId>]` |
| `chat` | `crumbless ai <slug> --message "…" --pipe` |
