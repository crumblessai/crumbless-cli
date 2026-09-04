# AI Chat — Guida

Il comando `ai` ti permette di chattare con l'AI di Crumbless direttamente dalla CLI. Può fare tutto ciò che fa il chatbot nella dashboard web.

## Uso base

```bash
crumbless ai my-brand --message "Il tuo messaggio"
```

## Esempi per categoria

### Analisi

```bash
# Analizza i post
crumbless ai my-brand --message "Analizza i miei ultimi 10 post e dimmi quali funzionano meglio"

# Benchmark competitor
crumbless ai my-brand --message "Confronta la mia strategia con i competitor"

# Suggerimenti
crumbless ai my-brand --message "Cosa posso migliorare nella mia strategia di contenuto?"
```

### Modifiche brand

```bash
# Brand kit
crumbless ai my-brand --message "Cambia la descrizione del brand in 'Ristorante fusion italiano'"
crumbless ai my-brand --message "Aggiorna il target audience a 'giovani professionisti 25-35'"

# Colori
crumbless ai my-brand --message "Imposta i colori del brand a #7c5cff e #ffffff"

# Voice
crumbless ai my-brand --message "Cambia il tone a friendly e professionale"
crumbless ai my-brand --message "Aggiungi 'costoso' alle parole vietate"
```

### Modifiche contenuto

```bash
# Caption
crumbless ai my-brand --message "Riscrivi la caption dell'ultimo post in modo più breve"
crumbless ai my-brand --message "Rendi la caption più emozionale"

# Approvazione
crumbless ai my-brand --message "Approva tutti i post pending"
crumbless ai my-brand --message "Approva il post con caption '...'"

# Scheduling
crumbless ai my-brand --message "Sposta il prossimo post a lunedì alle 10"
crumbless ai my-brand --message "Pubblica subito il post più recente"
```

### Strategia

```bash
# Piano editoriale
crumbless ai my-brand --message "Cambia il tema della settimana 2 a 'dietro le quinte'"
crumbless ai my-brand --message "Aumenta la frequenza a 5 post a settimana"
crumbless ai my-brand --message "Aggiungi LinkedIn al platform mix"

# GTM
crumbless ai my-brand --message "Cambia l'obiettivo GTM a 'aumentare le vendite online'"
crumbless ai my-brand --message "Aggiorna i KPI della fase corrente"
```

### Studio

```bash
# Competitor
crumbless ai my-brand --message "Aggiungi competitor Notion e Asana"
crumbless ai my-brand --message "Ricerca nuovi competitor"

# Prodotti
crumbless ai my-brand --message "Aggiorna il prezzo della Pizza Margherita a €14"

# Persone
crumbless ai my-brand --message "Aggiungi Marco come CEO del brand"

# Conoscenza
crumbless ai my-brand --message "Aggiungi una nota: il nostro pubblico preferisce video brevi"
```

## Pipe mode (per agenti AI)

Quando usi la CLI da un agente AI o in un pipeline, usa `--pipe` per output raw:

```bash
# Input da pipe
echo "Analizza i miei post" | crumbless ai my-brand --pipe

# Output raw (senza formattazione)
crumbless ai my-brand --message "Riassumi il brand" --pipe

# In uno script
response=$(crumbless ai my-brand --message "Quali sono i KPI?" --pipe)
echo "$response"
```

## Come funziona internamente

1. La CLI invia il messaggio a `POST /app/{slug}/chat`
2. Il backend costruisce il system prompt con tutti i dati del brand
3. L'AI (Gemini 3.5 Flash) risponde usando i suoi tools (read/write)
4. La risposta viene streamata alla CLI
5. Se l'AI esegue un'azione (es. modifica un post), i dati vengono aggiornati nel DB

## Limiti

- Le operazioni async (ricerca competitor, sync social, generazione persone AI) richiedono più tempo e possono non completarsi in una singola chiamata
- Per operazioni complesse, usa i comandi CLI dedicati (`crumbless studio`, `crumbless post`, etc.)
- L'AI ha accesso in lettura/scrittura a tutti i dati del brand

## Suggerimenti

- Sii specifico nei messaggi per risultati migliori
- Puoi fare riferimento a post, prodotti, persone per nome
- L'AI ricorda il contesto della conversazione (ultimi 50 messaggi)
- Usa `crumbless ai my-brand --message "aiuto"` per vedere cosa può fare
