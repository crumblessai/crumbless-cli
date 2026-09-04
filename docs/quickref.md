# Quick Reference — Crumbless CLI

## Comandi rapidi

```bash
# Panoramica
crumbless brands                              # Lista brand
crumbless dashboard <slug>                    # Dashboard completa
crumbless status <slug>                       # Status dettagliato

# Contenuti
crumbless content <slug>                      # Tutti i post
crumbless content <slug> --status pending     # Solo pending
crumbless approve <slug> --all                # Approva tutti

# Post (editing)
crumbless post <slug> <id>                    # Dettaglio post
crumbless post <slug> <id> edit --caption "..."  # Modifica caption
crumbless post <slug> <id> approve            # Approva
crumbless post <slug> <id> reject             # Elimina
crumbless post <slug> <id> publish            # Pubblica ora
crumbless post <slug> <id> reschedule --scheduledFor "2026-06-20T10:00"

# Piano editoriale
crumbless plan <slug>                         # Visualizza
crumbless plan <slug> propose                 # Genera primo piano
crumbless plan <slug> approve                 # Approva proposta
crumbless plan <slug> discard                 # Scarta proposta
crumbless plan <slug> revise --feedback "..." # Richiedi revisione
crumbless plan <slug> save-brief --week 0 --brief "..."
crumbless plan <slug> replan --week 0 --brief "..."

# Piano settimanale
crumbless weekly-plan <slug>                  # Visualizza
crumbless weekly-plan <slug> plan --week 0    # Genera seeds
crumbless weekly-plan <slug> produce --week 0 # Produci post

# GTM
crumbless gtm <slug>                          # GTM Roadmap

# Voice
crumbless voice <slug>                        # Voice rules

# AI Chat
crumbless ai <slug> --message "..."           # Chatta con l'AI
echo "..." | crumbless ai <slug>             # Pipe mode

# Analytics
crumbless analytics <slug>                    # Analytics
crumbless calendar <slug>                     # Calendario
crumbless calendar <slug> --month 2026-07     # Mese specifico

# Studio
crumbless studio <slug>                       # Mostra tutto
crumbless studio <slug> kit-update --about "..."
crumbless studio <slug> colors --colors "#hex,#hex"
crumbless studio <slug> add-note --text "..."
crumbless studio <slug> people-add --name "..."
crumbless studio <slug> people-generate --name "..." --gender female
crumbless studio <slug> add-competitor --name "..."
crumbless studio <slug> research              # Ricerca AI
crumbless studio <slug> sync-history          # Sync social

# Web / SEO / GEO
crumbless seo <slug>                          # Grade, iniziative, audit
crumbless seo <slug> run|plan|more            # Audit / piano / altre iniziative
crumbless seo <slug> asset|article --id <id>  # Genera da un'iniziativa
crumbless geo <slug>                          # Share of voice, citazioni
crumbless geo <slug> run|fix                  # Audit / genera fix
crumbless keywords <slug> [refresh]           # Keyword strategy
crumbless web <slug> [--status draft]         # Articoli blog
crumbless web <slug> generate --topic "..."   # Nuovo articolo
crumbless web <slug> optimize|publish --id <id>
crumbless ads <slug>                          # Campagne + metriche paid
crumbless ads <slug> --propose                # Proposte boost dai top post
crumbless ads <slug> --approve <id> [--budget N]
crumbless ads <slug> --pause <id>             # Pausa campagna (tutte le creatività)
crumbless ads <slug> --resume <id>            # Riattiva campagna
crumbless ads <slug> --pause <id> --ad <adId> # Pausa UNA creatività (A/B)
crumbless ads <slug> --resume <id> --ad <adId>
crumbless ads <slug> --duplicate <id>          # Copia in pausa → nuova proposta
crumbless ads <slug> --delete <id>             # Elimina sulla piattaforma (storico ok)
crumbless ads <slug> --create --name "..." --headline "..." [--platform metaads|googleads]
```

## Status post

| Status | Colore | Significato |
|--------|--------|-------------|
| `pending_user` | 🟡 Giallo | In attesa di approvazione |
| `approved` | 🔵 Blu | Approvato, in attesa di scheduling |
| `scheduled` | 🟢 Verde | Schedulato per pubblicazione |
| `published` | 🟢 Verde | Pubblicato |
| `failed` | 🔴 Rosso | Pubblicazione fallita |

## Pipeline autopilot

```
● Ricerca ─ ◉ Strategia ─ ○ Generazione ─ ○ Pubblicazione ─ ○ Analisi
```

- `●` Completato
- `◉` Fase corrente
- `○` Futuro

## Score completeness

| Score | Stato |
|-------|-------|
| 80-100% | Eccellente |
| 50-79% | Buono |
| 0-49% | Incompleto |
