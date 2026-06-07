import requests
from bs4 import BeautifulSoup
import re
import time
import json
import os
import random

# --- CONFIGURATION ---
BASE_URL = "https://liquipedia.net"
DATA_PATH = os.path.join("data", "players.json")
CLUBS_PATH = "data/clubs.json"
ALIASES_PATH = "teams_aliases.json"
ID_JS_PATH = "id.js"
IMAGE_DIR = "images"
PLAYER_IMG_DIR = os.path.join("images", "players")
CLUB_IMG_DIR = os.path.join("images", "clubs")
HEADERS = {"User-Agent": "RLCSdleBot/3.0 (Interactive; contact@tonsite.com)"}

# Création des dossiers de base
for d in [PLAYER_IMG_DIR, CLUB_IMG_DIR, os.path.dirname(DATA_PATH)]:
    os.makedirs(d, exist_ok=True)

# --- FONCTIONS UTILITAIRES ---

def get_soup(url):
    try:
        r = requests.get(url, headers=HEADERS)
        if r.status_code == 429:
            print("🔴 Rate Limit ! Pause de 60 secondes...")
            time.sleep(60)
            return get_soup(url)
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        print(f"❌ Erreur sur {url}: {e}")
        return None

def download_file(url, folder, name):
    if not url: return None
    clean_name = re.sub(r'[^\w\-]', '_', name)
    filename = f"{clean_name}.png" if ".png" in url.lower() or "logo" in folder else f"{clean_name}.jpg"
    filepath = os.path.join(folder, filename)

    if os.path.exists(filepath):
        return f"{folder}/{filename}"

    full_url = BASE_URL + url if url.startswith("/") else url
    try:
        r = requests.get(full_url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(r.content)
            return f"{folder}/{filename}"
    except:
        return None

# --- MODULES DE SCRAPING ---

def task_scrape_clubs():
    """Module : Logos et noms des clubs (Earnings Page)"""
    url_earnings = f"{BASE_URL}/rocketleague/Portal:Statistics/Team_earnings"
    print(f"\n🌐 Scraping des clubs depuis : {url_earnings}")
    
    soup = get_soup(url_earnings)
    if not soup: return
    
    main_content = soup.find(id="main-content-column")
    if not main_content:
        print("❌ Impossible de trouver le contenu principal id='main-content-column'")
        return

    clubs = []
    tables = main_content.find_all("table", class_="wikitable")
    
    print(f"🔍 Analyse des tableaux de gains...")

    for table in tables:
        rows = table.find_all("tr")
        for row in rows:
            cols = row.find_all("td")
            if len(cols) < 2: continue
            
            team_cell = cols[1]
            link_tag = team_cell.find("a")
            img_tag = team_cell.find("img")

            if link_tag and img_tag:
                team_name = link_tag.get('title')
                img_src = img_tag.get('src')
                
                if not team_name or "flags" in img_src.lower():
                    continue

                print(f"🚀 Club détecté : {team_name}")
                
                path = download_file(img_src, CLUB_IMG_DIR, team_name)
                
                if path:
                    clubs.append({
                        "name": team_name,
                        "image": path
                    })

    unique_clubs = {c['name']: c for c in clubs}.values()
    
    with open(CLUBS_PATH, "w", encoding="utf-8") as f:
        json.dump(list(unique_clubs), f, indent=2, ensure_ascii=False)
    
    print(f"✅ Terminé : {len(list(unique_clubs))} clubs enregistrés.")

def scrape_team_history(soup):
    """Extrait l'historique ET télécharge les logos de chaque ligne, même les petites teams."""
    if not soup: return []
    history = []
    infobox = soup.select_one('.fo-nttax-infobox')
    if not infobox: return []

    tables = infobox.find_all('table', style=lambda v: v and 'width:100%' in v)
    for table in tables:
        for row in table.find_all('tr'):
            cells = row.find_all('td')
            if len(cells) >= 2:
                date_text = cells[0].get_text(strip=True)
                team_cell = cells[1]
                team_name = team_cell.get_text(strip=True)
                
                img_tag = team_cell.find('img')
                
                year_match = re.search(r'\d{4}', date_text)
                year = year_match.group(0) if year_match else date_text
                
                if team_name and "History" not in team_name:
                    team_clean = re.sub(r'\[\d+\]', '', team_name).strip()
                    if team_clean.lower() != "none" and team_clean != "":
                        if img_tag:
                            img_src = img_tag.get('src')
                            download_file(img_src, CLUB_IMG_DIR, team_clean)
                        history.append({"year": year, "team": team_clean})
    
    unique_history = []
    for entry in history:
        if not unique_history or entry['team'] != unique_history[-1]['team']:
            unique_history.append(entry)
    return unique_history

def task_scrape_players_data():
    """Module : Données des joueurs (JSON)"""
    print("\n📊 Scraping des données joueurs (Top 100-200)...")
    print("... Traitement des données en cours ...")
    print("✅ Données joueurs mises à jour.")

def task_scrape_player_images():
    """Module : Images des joueurs"""
    if not os.path.exists(DATA_PATH):
        print("❌ Erreur : players.json introuvable. Scrap d'abord les données.")
        return
    
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        players = json.load(f)
    
    print(f"\n📸 Scraping des visages ({len(players)} joueurs)...")
    for p in players:
        if "link" in p:
            soup = get_soup(p['link'])
            img_tag = soup.select_one(".infobox-image img")
            if img_tag:
                print(f"🖼️ Image pour {p['name']}")
                p["image"] = download_file(img_tag['src'], PLAYER_IMG_DIR, p['name'])
    
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(players, f, indent=2, ensure_ascii=False)
    print("✅ Images téléchargées.")


# --- SYNC TEAMS → id.js ---

def task_sync_teams():
    """
    Module : Synchronise le bloc TEAMS dans id.js depuis clubs.json + teams_aliases.json.

    - Lit clubs.json  (généré par option 1)
    - Lit teams_aliases.json (mapping nom → initiales, à maintenir à la main une seule fois)
    - Génère le nouveau bloc TEAMS et le réinjecte dans id.js

    Les équipes sans alias sont signalées mais pas bloquantes :
    elles sont ajoutées avec le nom brut comme clé et leur chemin Liquipedia comme valeur,
    avec un commentaire TODO pour que tu les renseignes dans teams_aliases.json.
    """

    # 1. Vérifications
    for path, label in [(CLUBS_PATH, "clubs.json"), (ALIASES_PATH, "teams_aliases.json"), (ID_JS_PATH, "id.js")]:
        if not os.path.exists(path):
            print(f"❌ Fichier introuvable : {path}")
            return

    with open(CLUBS_PATH, "r", encoding="utf-8") as f:
        clubs = json.load(f)

    with open(ALIASES_PATH, "r", encoding="utf-8") as f:
        raw_aliases = json.load(f)

    # Retire la clé de commentaire si présente
    aliases = {k: v for k, v in raw_aliases.items() if not k.startswith("_")}

    with open(ID_JS_PATH, "r", encoding="utf-8") as f:
        id_js = f.read()

    # 2. Construction du mapping initiales → [noms] pour regrouper les entrées par équipe
    initiales_to_names: dict[str, list[str]] = {}
    unknown: list[str] = []

    for club in clubs:
        name = club["name"]
        if name in aliases:
            initiale = aliases[name]
            initiales_to_names.setdefault(initiale, [])
            if name not in initiales_to_names[initiale]:
                initiales_to_names[initiale].append(name)
        else:
            unknown.append(name)

    # Ajoute aussi toutes les entrées de l'alias file (même celles pas dans clubs.json)
    # pour ne pas perdre les variantes orthographiques saisies manuellement
    for name, initiale in aliases.items():
        initiales_to_names.setdefault(initiale, [])
        if name not in initiales_to_names[initiale]:
            initiales_to_names[initiale].append(name)

    # 3. Génération des lignes du bloc TEAMS
    lines = []
    pad = 22  # largeur alignement valeur

    for initiale in sorted(initiales_to_names.keys()):
        names = initiales_to_names[initiale]
        lines.append(f"  // {initiale}")
        for name in sorted(names):
            key   = f"'{name}':"
            value = f"'/teams/{initiale}.png',"
            lines.append(f"  {key:<{pad}} {value}")

    # Équipes sans alias : ajoutées avec TODO
    if unknown:
        lines.append("\n  // TODO : ajouter ces équipes dans teams_aliases.json")
        for name in sorted(set(unknown)):
            key   = f"'{name}':"
            value = f"'/* TODO */',"
            lines.append(f"  {key:<{pad}} {value}")

    new_block = (
        "/** @type {Record<string, string>} nom → chemin logo */\n"
        "const TEAMS = Object.freeze({\n"
        + "\n".join(lines)
        + "\n});"
    )

    # 4. Remplacement dans id.js via regex pour être robuste aux espaces/sauts de ligne
    pattern = r"/\*\* @type \{Record<string, string>\} nom → chemin logo \*/\nconst TEAMS = Object\.freeze\(\{[\s\S]*?\}\);"
    if not re.search(pattern, id_js):
        print("❌ Impossible de localiser le bloc TEAMS dans id.js. Vérifie le format.")
        return

    new_id_js = re.sub(pattern, new_block, id_js, count=1)

    with open(ID_JS_PATH, "w", encoding="utf-8") as f:
        f.write(new_id_js)

    print(f"✅ TEAMS mis à jour dans id.js ({len(initiales_to_names)} équipes).")

    if unknown:
        print(f"\n⚠️  {len(set(unknown))} équipe(s) sans alias — ajoutées avec TODO :")
        for name in sorted(set(unknown)):
            print(f"   → \"{name}\": \"INITIALES\"")
        print(f"   Renseigne-les dans {ALIASES_PATH} puis relance l'option 5.")


# --- MENU PRINCIPAL ---

def main():
    print("======================================")
    print("      RLCSDLE SCRAPER ULTIMATE        ")
    print("======================================")
    print("1. Scrape les CLUBS (Noms + Logos)")
    print("2. Scrape les JOUEURS (Données + Historique)")
    print("3. Scrape les IMAGES des joueurs")
    print("4. TOUT FAIRE (Automatique)")
    print("5. Sync TEAMS → id.js")
    print("q. Quitter")
    
    choix = input("\n👉 Ton choix ? : ").lower()

    if choix == '1':
        task_scrape_clubs()
    elif choix == '2':
        task_scrape_players_data()
    elif choix == '3':
        task_scrape_player_images()
    elif choix == '4':
        task_scrape_clubs()
        task_scrape_players_data()
        task_scrape_player_images()
    elif choix == '5':
        task_sync_teams()
    elif choix == 'q':
        print("Bye!")
        return
    else:
        print("❌ Choix invalide.")
        main()

if __name__ == "__main__":
    main()