import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import requests
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("FOOTBALL_API_KEY")
BASE_URL = "https://api.football-data.org/v4"
HEADERS = {"X-Auth-Token": API_KEY}

# --- LEAGUE CONFIG ---
LEAGUES = {
    "🇪🇸 La Liga": {"id": "PD"},
    "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League": {"id": "PL"},
    "🇩🇪 Bundesliga": {"id": "BL1"},
    "🇮🇹 Serie A": {"id": "SA"},
    "🇫🇷 Ligue 1": {"id": "FL1"},
    "🏆 Champions League": {"id": "CL"},
}

# --- TEAM IDS ---
TEAM_IDS = {
    "AC Milan": 98,
    "ACF Fiorentina": 99,
    "AFC Ajax": 674,
    "AFC Bournemouth": 1044,
    "AS Monaco FC": 548,
    "AS Roma": 100,
    "Athletic Club Bilbao": 77,
    "Atalanta BC": 102,
    "Bayer 04 Leverkusen": 3,
    "Bayern München": 5,
    "Borussia Dortmund": 4,
    "Borussia Mönchengladbach": 18,
    "Brentford FC": 402,
    "Brighton & Hove Albion FC": 397,
    "CA Osasuna": 79,
    "Celtic FC": 732,
    "Celta de Vigo": 558,
    "Chelsea FC": 61,
    "Club Atlético de Madrid": 78,
    "Crystal Palace FC": 354,
    "Eintracht Frankfurt": 19,
    "Espanyol": 80,
    "Everton FC": 62,
    "FC Barcelona": 81,
    "FC Porto": 503,
    "Fulham FC": 63,
    "Getafe CF": 84,
    "Inter Milan": 108,
    "Juventus FC": 109,
    "Liverpool FC": 64,
    "LOSC Lille": 521,
    "Manchester City FC": 65,
    "Manchester United FC": 66,
    "Newcastle United FC": 67,
    "Nottingham Forest FC": 351,
    "Olympique de Marseille": 516,
    "Olympique Lyonnais": 523,
    "Paris Saint-Germain FC": 524,
    "Rangers FC": 733,
    "Rayo Vallecano": 87,
    "RB Leipzig": 721,
    "RCD Mallorca": 89,
    "Real Betis Balompié": 90,
    "Real Madrid CF": 86,
    "Real Sociedad": 92,
    "SC Freiburg": 17,
    "Sevilla FC": 559,
    "SL Benfica": 1903,
    "Sporting CP": 498,
    "SS Lazio": 110,
    "SSC Napoli": 113,
    "Tottenham Hotspur FC": 73,
    "UD Las Palmas": 275,
    "Valencia CF": 95,
    "VfB Stuttgart": 10,
    "Villarreal CF": 94,
    "West Ham United FC": 563,
    "Wolverhampton Wanderers FC": 76,
}

# --- PAGE CONFIG ---
st.set_page_config(page_title="Football Analytics Hub", page_icon="⚽", layout="wide")

# --- CSS ---
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;600&display=swap');
    .stApp { background-color: #0a0a0f; color: #ffffff; }
    .main-title { font-family: 'Bebas Neue', sans-serif; font-size: 64px; letter-spacing: 6px; line-height: 1; margin-bottom: 0; }
    .sub-title { font-family: 'Inter', sans-serif; font-weight: 300; font-size: 13px; color: #666; letter-spacing: 6px; text-transform: uppercase; margin-top: 4px; }
    .section-header { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: #ffffff; letter-spacing: 3px; border-bottom: 1px solid #222; padding-bottom: 6px; margin: 28px 0 14px 0; }
    div[data-testid="stMetric"] { background: linear-gradient(135deg, #111118, #1a1a28); border: 1px solid #222; border-left: 3px solid #A50044; border-radius: 8px; padding: 16px 20px; }
    div[data-testid="stMetricValue"] { font-family: 'Bebas Neue', sans-serif !important; font-size: 36px !important; color: #A50044 !important; }
    div[data-testid="stMetricLabel"] { font-family: 'Inter', sans-serif; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #555 !important; }
    .match-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 8px; padding: 12px 16px; margin: 6px 0; font-family: 'Inter', sans-serif; }
    .match-score { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #fff; }
    .match-team { font-size: 13px; color: #ccc; }
    .match-date { font-size: 10px; color: #444; letter-spacing: 2px; }
    h1, h2, h3 { color: #fff !important; }
</style>
""", unsafe_allow_html=True)


# --- API FUNCTIONS ---
@st.cache_data(ttl=300)
def get_standings(league_id):
    try:
        r = requests.get(f"{BASE_URL}/competitions/{league_id}/standings", headers=HEADERS, timeout=10)
        return r.json() if r.status_code == 200 else None
    except:
        return None

@st.cache_data(ttl=300)
def get_matches(league_id):
    try:
        r = requests.get(f"{BASE_URL}/competitions/{league_id}/matches?status=FINISHED&limit=20", headers=HEADERS, timeout=10)
        return r.json() if r.status_code == 200 else None
    except:
        return None

@st.cache_data(ttl=300)
def get_scorers(league_id):
    try:
        r = requests.get(f"{BASE_URL}/competitions/{league_id}/scorers?limit=10", headers=HEADERS, timeout=10)
        return r.json() if r.status_code == 200 else None
    except:
        return None

@st.cache_data(ttl=300)
def get_upcoming(league_id):
    try:
        r = requests.get(f"{BASE_URL}/competitions/{league_id}/matches?status=SCHEDULED&limit=10", headers=HEADERS, timeout=10)
        return r.json() if r.status_code == 200 else None
    except:
        return None

@st.cache_data(ttl=300)
def get_team_matches(team_id):
    try:
        r = requests.get(f"{BASE_URL}/teams/{team_id}/matches?status=FINISHED&limit=100", headers=HEADERS, timeout=10)
        if r.status_code == 200:
            matches = r.json().get("matches", [])
            return [
                m for m in matches
                if m.get("status") == "FINISHED"
                and m.get("score", {}).get("fullTime", {}).get("home") is not None
                and m.get("score", {}).get("fullTime", {}).get("away") is not None
            ]
        return None
    except:
        return None

@st.cache_data(ttl=300)
def get_h2h(team1_id, team2_id):
    try:
        r = requests.get(f"{BASE_URL}/teams/{team1_id}/matches?status=FINISHED&limit=100", headers=HEADERS, timeout=10)
        if r.status_code == 200:
            matches = r.json().get("matches", [])
            return [
                m for m in matches
                if (m["homeTeam"]["id"] == team2_id or m["awayTeam"]["id"] == team2_id)
                and m.get("status") == "FINISHED"
                and m.get("score", {}).get("fullTime", {}).get("home") is not None
                and m.get("score", {}).get("fullTime", {}).get("away") is not None
            ]
        return None
    except:
        return None

@st.cache_data
def load_historical():
    try:
        return pd.read_csv("LaLiga_Matches.csv")
    except:
        return None


# --- HEADER ---
st.markdown('<p class="main-title" style="color:#A50044;">FOOTBALL</p>', unsafe_allow_html=True)
st.markdown('<p class="main-title" style="color:#ffffff; margin-top:-16px;">ANALYTICS HUB</p>', unsafe_allow_html=True)
st.markdown('<p class="sub-title">Live data · Team deep dive · All competitions · Built by Muhammad Mustafa</p>', unsafe_allow_html=True)
st.markdown("<br>", unsafe_allow_html=True)

tab1, tab2 = st.tabs(["🌍 Live League Data", "📊 Team Deep Dive"])


# ================================================================
# TAB 1 — LIVE DATA
# ================================================================
with tab1:
    selected_league_name = st.selectbox("Select League", list(LEAGUES.keys()))
    league_id = LEAGUES[selected_league_name]["id"]
    st.markdown("<br>", unsafe_allow_html=True)

    col_s, col_m, col_sc = st.columns([2, 2, 1])

    with col_s:
        st.markdown('<p class="section-header">STANDINGS</p>', unsafe_allow_html=True)
        standings_data = get_standings(league_id)
        if standings_data:
            try:
                table = standings_data["standings"][0]["table"]
                rows = []
                for entry in table:
                    rows.append({
                        "#": entry["position"],
                        "Team": entry["team"]["name"],
                        "P": entry["playedGames"],
                        "W": entry["won"],
                        "D": entry["draw"],
                        "L": entry["lost"],
                        "GF": entry["goalsFor"],
                        "GA": entry["goalsAgainst"],
                        "GD": entry["goalDifference"],
                        "Pts": entry["points"],
                    })
                st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True, height=600)
            except Exception as e:
                st.error(f"Could not parse standings: {e}")
        else:
            st.warning("Could not load standings. API limit may be reached.")

    with col_m:
        st.markdown('<p class="section-header">RECENT RESULTS</p>', unsafe_allow_html=True)
        matches_data = get_matches(league_id)
        if matches_data and "matches" in matches_data:
            for m in matches_data["matches"][-15:][::-1]:
                try:
                    home = m["homeTeam"].get("shortName") or m["homeTeam"]["name"]
                    away = m["awayTeam"].get("shortName") or m["awayTeam"]["name"]
                    hg = m["score"]["fullTime"]["home"]
                    ag = m["score"]["fullTime"]["away"]
                    date = m["utcDate"][:10]
                    score = f"{hg} - {ag}" if hg is not None else "vs"
                    st.markdown(f"""
                    <div class="match-card">
                        <div class="match-date">{date}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                            <span class="match-team">{home}</span>
                            <span class="match-score">{score}</span>
                            <span class="match-team">{away}</span>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
                except:
                    continue
        else:
            st.warning("Could not load recent matches.")

    with col_sc:
        st.markdown('<p class="section-header">TOP SCORERS</p>', unsafe_allow_html=True)
        scorers_data = get_scorers(league_id)
        if scorers_data and "scorers" in scorers_data:
            for i, s in enumerate(scorers_data["scorers"][:10]):
                try:
                    name = s["player"]["name"]
                    team = s["team"].get("shortName") or s["team"]["name"]
                    goals = s.get("goals") or 0
                    st.markdown(f"""
                    <div class="match-card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <div style="font-family:'Inter'; font-size:13px; color:#fff;">#{i+1} {name}</div>
                                <div style="font-family:'Inter'; font-size:10px; color:#555; letter-spacing:1px;">{team}</div>
                            </div>
                            <div style="font-family:'Bebas Neue'; font-size:28px; color:#A50044;">{goals}</div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
                except:
                    continue
        else:
            st.warning("Could not load scorers.")

    st.markdown('<p class="section-header">UPCOMING FIXTURES</p>', unsafe_allow_html=True)
    upcoming_data = get_upcoming(league_id)
    if upcoming_data and "matches" in upcoming_data:
        cols = st.columns(4)
        for i, m in enumerate(upcoming_data["matches"][:8]):
            try:
                home = m["homeTeam"].get("shortName") or m["homeTeam"]["name"]
                away = m["awayTeam"].get("shortName") or m["awayTeam"]["name"]
                date = m["utcDate"][:10]
                with cols[i % 4]:
                    st.markdown(f"""
                    <div class="match-card">
                        <div class="match-date">{date}</div>
                        <div style="font-family:'Inter'; font-size:12px; color:#ccc; margin-top:4px;">{home}</div>
                        <div style="font-family:'Bebas Neue'; font-size:16px; color:#555; margin:2px 0;">VS</div>
                        <div style="font-family:'Inter'; font-size:12px; color:#ccc;">{away}</div>
                    </div>
                    """, unsafe_allow_html=True)
            except:
                continue
    else:
        st.info("No upcoming fixtures found.")

    st.markdown('<p class="section-header">ALL-TIME HEAD-TO-HEAD — ALL COMPETITIONS</p>', unsafe_allow_html=True)
    st.caption("Covers La Liga, Champions League, Copa del Rey & more — powered by live API")

    team_names = sorted(list(TEAM_IDS.keys()))
    h2h_col1, h2h_col2 = st.columns(2)
    with h2h_col1:
        h2h_team1 = st.selectbox("Team A", team_names, index=team_names.index("FC Barcelona"), key="h2h_t1")
    with h2h_col2:
        h2h_team2 = st.selectbox("Team B", team_names, index=team_names.index("Real Madrid CF"), key="h2h_t2")

    if h2h_team1 != h2h_team2:
        with st.spinner("Fetching head-to-head data..."):
            h2h_matches = get_h2h(TEAM_IDS[h2h_team1], TEAM_IDS[h2h_team2])

        if h2h_matches and len(h2h_matches) > 0:
            t1_wins, t2_wins, h2h_draws = 0, 0, 0
            for m in h2h_matches:
                hg = m["score"]["fullTime"]["home"]
                ag = m["score"]["fullTime"]["away"]
                is_home = m["homeTeam"]["id"] == TEAM_IDS[h2h_team1]
                if hg == ag:
                    h2h_draws += 1
                elif (is_home and hg > ag) or (not is_home and ag > hg):
                    t1_wins += 1
                else:
                    t2_wins += 1

            hh1, hh2, hh3, hh4 = st.columns(4)
            with hh1: st.metric(f"{h2h_team1} Wins", t1_wins)
            with hh2: st.metric("Draws", h2h_draws)
            with hh3: st.metric(f"{h2h_team2} Wins", t2_wins)
            with hh4: st.metric("Total Meetings", len(h2h_matches))

            fig_h2h = go.Figure(go.Bar(
                x=[t1_wins, h2h_draws, t2_wins],
                y=[h2h_team1, "Draws", h2h_team2],
                orientation="h",
                marker_color=["#A50044", "#444", "#FEBE10"],
                text=[t1_wins, h2h_draws, t2_wins], textposition="auto"
            ))
            fig_h2h.update_layout(
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                font_color="#888", xaxis=dict(showgrid=False), yaxis=dict(showgrid=False),
                margin=dict(l=0, r=0, t=10, b=0), height=160, showlegend=False)
            st.plotly_chart(fig_h2h, use_container_width=True)

            rows = []
            for m in sorted(h2h_matches, key=lambda x: x["utcDate"], reverse=True):
                try:
                    rows.append({
                        "Date": m["utcDate"][:10],
                        "Competition": m["competition"]["name"],
                        "Home": m["homeTeam"].get("shortName") or m["homeTeam"]["name"],
                        "H": int(m["score"]["fullTime"]["home"]),
                        "A": int(m["score"]["fullTime"]["away"]),
                        "Away": m["awayTeam"].get("shortName") or m["awayTeam"]["name"],
                    })
                except:
                    continue
            if rows:
                st.markdown("##### Complete Match History")
                st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
        elif h2h_matches is not None:
            st.info(f"No finished matches found between {h2h_team1} and {h2h_team2}.")
        else:
            st.warning("Could not load H2H data. API limit may be reached.")
    else:
        st.info("Select two different teams to compare.")


# ================================================================
# TAB 2 — TEAM DEEP DIVE
# ================================================================
with tab2:
    st.markdown('<p class="section-header">TEAM DEEP DIVE — ALL COMPETITIONS</p>', unsafe_allow_html=True)
    st.caption("Full match history across La Liga, Champions League, Copa del Rey, Premier League & more")

    team_names = sorted(list(TEAM_IDS.keys()))
    col_team_sel, col_comp_filter = st.columns([1, 1])
    with col_team_sel:
        selected_team = st.selectbox("Select Team", team_names, index=team_names.index("FC Barcelona"), key="deepdive_team")

    with st.spinner(f"Loading {selected_team} match history..."):
        all_matches = get_team_matches(TEAM_IDS[selected_team])

    if not all_matches:
        st.warning("Could not load team data. API limit may be reached — try again in a minute.")
    else:
        comps = sorted(set(m["competition"]["name"] for m in all_matches))
        with col_comp_filter:
            selected_comps = st.multiselect("Filter by Competition", comps, default=comps)

        filtered = [m for m in all_matches if m["competition"]["name"] in selected_comps] if selected_comps else all_matches

        if not filtered:
            st.warning("No matches found for selected filters.")
        else:
            team_id = TEAM_IDS[selected_team]
            wins, draws, losses, goals_scored, goals_conceded = 0, 0, 0, 0, 0

            for m in filtered:
                hg = m["score"]["fullTime"]["home"]
                ag = m["score"]["fullTime"]["away"]
                is_home = m["homeTeam"]["id"] == team_id
                gf = hg if is_home else ag
                ga = ag if is_home else hg
                goals_scored += gf
                goals_conceded += ga
                if hg == ag:
                    draws += 1
                elif (is_home and hg > ag) or (not is_home and ag > hg):
                    wins += 1
                else:
                    losses += 1

            total = wins + draws + losses
            win_rate = round(wins / total * 100, 1) if total > 0 else 0
            goal_diff = goals_scored - goals_conceded

            c1, c2, c3, c4, c5, c6, c7 = st.columns(7)
            with c1: st.metric("Matches", total)
            with c2: st.metric("Wins", wins)
            with c3: st.metric("Draws", draws)
            with c4: st.metric("Losses", losses)
            with c5: st.metric("Win Rate", f"{win_rate}%")
            with c6: st.metric("Goals Scored", goals_scored)
            with c7: st.metric("Goal Diff", f"+{goal_diff}" if goal_diff > 0 else str(goal_diff))

            col_left, col_right = st.columns([2, 1])

            with col_left:
                comp_goals = {}
                for m in filtered:
                    comp = m["competition"]["name"]
                    hg = m["score"]["fullTime"]["home"]
                    ag = m["score"]["fullTime"]["away"]
                    is_home = m["homeTeam"]["id"] == team_id
                    gf = hg if is_home else ag
                    comp_goals[comp] = comp_goals.get(comp, 0) + gf

                comp_df = pd.DataFrame(list(comp_goals.items()), columns=["Competition", "Goals"]).sort_values("Goals")
                fig_comp = px.bar(comp_df, x="Goals", y="Competition", orientation="h",
                    title=f"{selected_team} — Goals by Competition",
                    color="Goals", color_continuous_scale=["#330011", "#A50044"], text="Goals")
                fig_comp.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                    font_color="#888", title_font_color="#fff", coloraxis_showscale=False,
                    xaxis=dict(showgrid=False), yaxis=dict(showgrid=False), margin=dict(l=0, r=0, t=40, b=0))
                st.plotly_chart(fig_comp, use_container_width=True)

            with col_right:
                fig_donut = go.Figure(data=[go.Pie(
                    labels=["Wins", "Draws", "Losses"],
                    values=[wins, draws, losses],
                    hole=0.65,
                    marker_colors=["#A50044", "#FEBE10", "#222"],
                    textinfo="percent", textfont_size=12)])
                fig_donut.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                    font_color="#888", title_text="Match Outcomes", title_font_color="#fff",
                    showlegend=True, legend=dict(font=dict(color="#888"), bgcolor="rgba(0,0,0,0)"),
                    margin=dict(l=0, r=0, t=40, b=0),
                    annotations=[dict(text=f"{win_rate}%<br>WIN", x=0.5, y=0.5,
                        font_size=20, font_color="#A50044", font_family="Bebas Neue", showarrow=False)])
                st.plotly_chart(fig_donut, use_container_width=True)

            st.markdown('<p class="section-header">RECENT MATCH HISTORY</p>', unsafe_allow_html=True)
            rows = []
            for m in sorted(filtered, key=lambda x: x["utcDate"], reverse=True):
                try:
                    hg = m["score"]["fullTime"]["home"]
                    ag = m["score"]["fullTime"]["away"]
                    is_home = m["homeTeam"]["id"] == team_id
                    if hg == ag: result = "D"
                    elif (is_home and hg > ag) or (not is_home and ag > hg): result = "W"
                    else: result = "L"
                    rows.append({
                        "Date": m["utcDate"][:10],
                        "Competition": m["competition"]["name"],
                        "Home": m["homeTeam"].get("shortName") or m["homeTeam"]["name"],
                        "H": int(hg),
                        "A": int(ag),
                        "Away": m["awayTeam"].get("shortName") or m["awayTeam"]["name"],
                        "Result": result,
                    })
                except:
                    continue
            if rows:
                st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

    # La Liga historical power rankings
    st.markdown('<p class="section-header">LA LIGA HISTORICAL POWER RANKINGS (1995–2025)</p>', unsafe_allow_html=True)
    st.caption("From the 30-year CSV dataset")
    df_alltime = load_historical()
    if df_alltime is not None:
        ct1, ct2 = st.columns(2)
        with ct1:
            home_played = df_alltime.groupby("HomeTeam").size()
            home_won = df_alltime[df_alltime["FTR"] == "H"].groupby("HomeTeam").size()
            home_win_pct = (home_won / home_played * 100).round(1).sort_values(ascending=False).head(10).reset_index()
            home_win_pct.columns = ["Team", "Home Win %"]
            fig1 = px.bar(home_win_pct.sort_values("Home Win %"), x="Home Win %", y="Team",
                orientation="h", title="Top 10 Home Win % — All Time",
                color="Home Win %", color_continuous_scale=["#330011", "#A50044"], text="Home Win %")
            fig1.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                font_color="#888", title_font_color="#fff", coloraxis_showscale=False,
                xaxis=dict(showgrid=False), yaxis=dict(showgrid=False), margin=dict(l=0, r=0, t=40, b=0))
            st.plotly_chart(fig1, use_container_width=True)
        with ct2:
            top_goals = df_alltime.groupby("HomeTeam")["FTHG"].sum().sort_values(ascending=False).head(10).reset_index()
            top_goals.columns = ["Team", "Goals"]
            fig2 = px.bar(top_goals.sort_values("Goals"), x="Goals", y="Team",
                orientation="h", title="Top 10 Home Goals Scored — All Time",
                color="Goals", color_continuous_scale=["#330011", "#A50044"], text="Goals")
            fig2.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                font_color="#888", title_font_color="#fff", coloraxis_showscale=False,
                xaxis=dict(showgrid=False), yaxis=dict(showgrid=False), margin=dict(l=0, r=0, t=40, b=0))
            st.plotly_chart(fig2, use_container_width=True)

# --- FOOTER ---
st.markdown("<br><br>", unsafe_allow_html=True)
st.markdown(
    '<p style="text-align:center; color:#222; font-family:Inter; font-size:11px; letter-spacing:3px;">FOOTBALL ANALYTICS HUB · BUILT BY MUHAMMAD MUSTAFA · LIVE DATA: FOOTBALL-DATA.ORG · HISTORICAL: KAGGLE</p>',
    unsafe_allow_html=True)
st.markdown(
    '<p style="text-align:center; color:#222; font-family:Inter; font-size:11px; letter-spacing:3px;">FOOTBALL ANALYTICS HUB · BUILT BY MUHAMMAD MUSTAFA · LIVE DATA: FOOTBALL-DATA.ORG · HISTORICAL: KAGGLE</p>',
    unsafe_allow_html=True)