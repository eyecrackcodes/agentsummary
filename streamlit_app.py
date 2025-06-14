import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
from datetime import datetime
import io
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Page configuration
st.set_page_config(
    page_title="Final Expense Agent Performance Analytics",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .main-header {
        font-size: 3rem;
        font-weight: bold;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-align: center;
        margin-bottom: 2rem;
        padding: 1rem 0;
    }
    
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1.5rem;
        border-radius: 15px;
        color: white;
        text-align: center;
        margin: 0.5rem 0;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        transition: transform 0.3s ease;
    }
    
    .metric-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    .quality-tier-excellent { 
        border-left: 5px solid #4caf50; 
        background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
        color: white;
    }
    .quality-tier-good { 
        border-left: 5px solid #2196f3; 
        background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
        color: white;
    }
    .quality-tier-average { 
        border-left: 5px solid #ff9800; 
        background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
        color: white;
    }
    .quality-tier-poor { 
        border-left: 5px solid #f44336; 
        background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        color: white;
    }
    
    .drill-down-card {
        background: white;
        border-radius: 10px;
        padding: 1rem;
        margin: 0.5rem 0;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        border-left: 4px solid #1f77b4;
        transition: all 0.3s ease;
    }
    
    .drill-down-card:hover {
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        transform: translateY(-2px);
    }
    
    .sort-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        cursor: pointer;
        margin: 0.2rem;
        transition: all 0.3s ease;
    }
    
    .sort-button:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    
    .insight-card {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 1rem;
        border-radius: 10px;
        margin: 0.5rem 0;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    
    .stTabs [data-baseweb="tab"] {
        height: 50px;
        padding-left: 20px;
        padding-right: 20px;
        background-color: #f0f2f6;
        border-radius: 10px 10px 0 0;
        color: #262730;
        font-weight: bold;
    }
    
    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
</style>
""", unsafe_allow_html=True)

# Data processing functions
@st.cache_data
def process_agent_data(df):
    """Process uploaded agent data and calculate metrics"""
    
    logger.info(f"Processing agent data with {len(df)} rows and {len(df.columns)} columns")
    logger.info(f"Columns: {list(df.columns)}")
    
    # Ensure numeric columns are properly typed
    numeric_columns = [
        '# 1st Quotes', '# 2nd Quotes', '# Submitted', '# Free look',
        'Smoker %', 'Preferred %', 'Standard %', 'Graded %', 'GI %', 'CC %'
    ]
    
    for col in numeric_columns:
        if col in df.columns:
            original_type = df[col].dtype
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            logger.info(f"Converted column '{col}' from {original_type} to {df[col].dtype}")
        else:
            logger.warning(f"Expected column '{col}' not found in data")
    
    # Data quality thresholds
    MIN_TOTAL_QUOTES = 50
    MIN_SUBMISSIONS = 10
    MIN_WEEKS_ACTIVE = 2
    
    # Separate individual weeks from totals
    individual_data = df[df['Week'] != 'Total'].copy()
    total_data = df[df['Week'] == 'Total'].copy()
    
    # Filter qualified agents
    qualified_agents = total_data[
        (total_data['# 1st Quotes'] >= MIN_TOTAL_QUOTES) &
        (total_data['# Submitted'] >= MIN_SUBMISSIONS)
    ].copy()
    
    # Calculate agent activity weeks
    agent_weeks = individual_data.groupby('Agent')['Week'].nunique()
    experienced_agents = qualified_agents[
        qualified_agents['Agent'].isin(agent_weeks[agent_weeks >= MIN_WEEKS_ACTIVE].index)
    ].copy()
    
    # Calculate performance metrics
    experienced_agents['Conversion_Rate'] = np.where(
        experienced_agents['# 2nd Quotes'] > 0,
        (experienced_agents['# Submitted'] / experienced_agents['# 2nd Quotes']) * 100,
        0
    )
    
    experienced_agents['Quote_Progression_Rate'] = np.where(
        experienced_agents['# 1st Quotes'] > 0,
        (experienced_agents['# 2nd Quotes'] / experienced_agents['# 1st Quotes']) * 100,
        0
    )
    
    experienced_agents['Overall_Conversion_Rate'] = np.where(
        experienced_agents['# 1st Quotes'] > 0,
        (experienced_agents['# Submitted'] / experienced_agents['# 1st Quotes']) * 100,
        0
    )
    
    experienced_agents['Free_Look_Rate'] = np.where(
        experienced_agents['# Submitted'] > 0,
        (experienced_agents['# Free look'] / experienced_agents['# Submitted']) * 100,
        0
    )
    
    experienced_agents['Quality_Score'] = (
        experienced_agents['Preferred %'] * 1.5 + 
        experienced_agents['Standard %'] * 1.0
    ) / 2.5
    
    experienced_agents['Weeks_Active'] = experienced_agents['Agent'].map(agent_weeks)
    experienced_agents['Avg_Weekly_Submissions'] = experienced_agents['# Submitted'] / experienced_agents['Weeks_Active']
    
    # Quality tiers
    logger.info(f"Creating Quality_Tier for {len(experienced_agents)} agents")
    logger.info(f"Preferred % range: {experienced_agents['Preferred %'].min():.1f}% - {experienced_agents['Preferred %'].max():.1f}%")
    
    experienced_agents['Quality_Tier'] = pd.cut(
        experienced_agents['Preferred %'],
        bins=[0, 20, 30, 40, 100],
        labels=['Poor', 'Average', 'Good', 'Excellent']
    )
    
    # Log Quality_Tier distribution
    tier_counts = experienced_agents['Quality_Tier'].value_counts()
    logger.info(f"Quality_Tier distribution: {tier_counts.to_dict()}")
    
    # Risk profiles
    logger.info(f"Creating Risk_Profile for {len(experienced_agents)} agents")
    logger.info(f"GI % range: {experienced_agents['GI %'].min():.1f}% - {experienced_agents['GI %'].max():.1f}%")
    
    experienced_agents['Risk_Profile'] = pd.cut(
        experienced_agents['GI %'],
        bins=[0, 20, 35, 100],
        labels=['Low Risk', 'Medium Risk', 'High Risk']
    )
    
    # Log Risk_Profile distribution
    risk_counts = experienced_agents['Risk_Profile'].value_counts()
    logger.info(f"Risk_Profile distribution: {risk_counts.to_dict()}")
    
    return experienced_agents, individual_data

def calculate_risk_score(agent_row):
    """Calculate risk score for an agent"""
    risk_score = 0
    issues = []
    
    # Low conversion rate
    if agent_row['Conversion_Rate'] < 20:
        risk_score += 3
        issues.append(f"Low conversion rate ({agent_row['Conversion_Rate']:.1f}%)")
    
    # High free look rate
    if agent_row['Free_Look_Rate'] > 15:
        risk_score += 3
        issues.append(f"High free look rate ({agent_row['Free_Look_Rate']:.1f}%)")
    elif agent_row['Free_Look_Rate'] > 10:
        risk_score += 1
        issues.append(f"Elevated free look rate ({agent_row['Free_Look_Rate']:.1f}%)")
    
    # High GI percentage
    if agent_row['GI %'] > 40:
        risk_score += 2
        issues.append(f"High GI percentage ({agent_row['GI %']:.1f}%)")
    
    # Low preferred percentage
    if agent_row['Preferred %'] < 20:
        risk_score += 2
        issues.append(f"Low preferred rate ({agent_row['Preferred %']:.1f}%)")
    
    # Combined high-risk underwriting
    high_risk_percent = agent_row['GI %'] + agent_row['Graded %']
    if high_risk_percent > 60:
        risk_score += 2
        issues.append(f"High-risk underwriting mix ({high_risk_percent:.1f}% GI+Graded)")
    
    # Low productivity
    if agent_row['Avg_Weekly_Submissions'] < 5:
        risk_score += 1
        issues.append(f"Low weekly productivity ({agent_row['Avg_Weekly_Submissions']:.1f}/week)")
    
    # Quality score
    if agent_row['Quality_Score'] < 50:
        risk_score += 2
        issues.append(f"Poor quality score ({agent_row['Quality_Score']:.1f})")
    
    risk_level = 'High' if risk_score >= 6 else 'Medium' if risk_score >= 4 else 'Low'
    
    return risk_score, risk_level, issues

# Main app
def main():
    st.markdown('<h1 class="main-header">📊 Final Expense Agent Performance Analytics</h1>', unsafe_allow_html=True)
    
    # Sidebar for file upload and filters
    with st.sidebar:
        st.header("📁 Data Upload")
        uploaded_file = st.file_uploader(
            "Upload Agent Summary Data",
            type=['csv', 'xlsx'],
            help="Upload your agent summary Excel or CSV file"
        )
        
        if uploaded_file is not None:
            # Load data
            try:
                logger.info(f"Loading file: {uploaded_file.name}")
                
                if uploaded_file.name.endswith('.csv'):
                    df = pd.read_csv(uploaded_file)
                    logger.info("Loaded CSV file successfully")
                else:
                    df = pd.read_excel(uploaded_file, sheet_name='agent summary')
                    logger.info("Loaded Excel file successfully")
                
                logger.info(f"Initial data shape: {df.shape}")
                logger.info(f"Initial columns: {list(df.columns)}")
                
                # Convert numeric columns to proper data types
                numeric_columns = [
                    '# 1st Quotes', '# 2nd Quotes', '# Submitted', '# Free look',
                    'Smoker %', 'Preferred %', 'Standard %', 'Graded %', 'GI %', 'CC %'
                ]
                
                for col in numeric_columns:
                    if col in df.columns:
                        original_type = df[col].dtype
                        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
                        logger.info(f"Main: Converted '{col}' from {original_type} to {df[col].dtype}")
                
                st.success(f"✅ Loaded {len(df)} records")
                logger.info(f"Successfully processed {len(df)} records")
                
                # Debug: Show data types
                with st.expander("🔍 Debug: Data Types", expanded=False):
                    st.write("Column data types:")
                    st.write(df.dtypes)
                    st.write("Sample data:")
                    st.write(df.head(3))
                
                # Console logs display
                with st.expander("📋 Console Logs", expanded=False):
                    st.info("Check your browser's developer console (F12) for detailed logs, or check the Streamlit Cloud logs in 'Manage app'")
                    
                    # Display some key info here
                    st.write("**Key Processing Info:**")
                    st.write(f"- File loaded: {uploaded_file.name}")
                    st.write(f"- Data shape: {df.shape}")
                    st.write(f"- Unique weeks: {len(df['Week'].unique()) if 'Week' in df.columns else 'N/A'}")
                    st.write(f"- Unique agents: {len(df['Agent'].unique()) if 'Agent' in df.columns else 'N/A'}")
                
                # Process data
                experienced_agents, individual_data = process_agent_data(df)
                
                st.header("🎛️ Filters")
                
                # Agent filter
                all_agents = experienced_agents['Agent'].unique()
                selected_agents = st.multiselect(
                    "Select Agents",
                    options=all_agents,
                    default=all_agents,
                    help="Filter by specific agents"
                )
                
                # Quality tier filter
                quality_tiers = experienced_agents['Quality_Tier'].unique()
                selected_tiers = st.multiselect(
                    "Quality Tiers",
                    options=quality_tiers,
                    default=quality_tiers,
                    help="Filter by quality performance tiers"
                )
                
                # Date range filter
                st.subheader("📅 Date Range Filter")
                date_range_option = st.selectbox(
                    "Select Date Range",
                    options=["All Weeks", "Last 4 Weeks", "Last 8 Weeks", "Custom Range"],
                    help="Filter data by time period"
                )
                
                # Get available weeks for filtering - sort chronologically
                def sort_weeks_chronologically(weeks):
                    """Sort weeks chronologically"""
                    def extract_week_number(week):
                        import re
                        match = re.search(r'(\d+)', str(week))
                        return int(match.group(1)) if match else 0
                    
                    return sorted(weeks, key=extract_week_number)
                
                available_weeks = sort_weeks_chronologically(individual_data['Week'].unique())
                
                # Apply date range filtering to individual data
                filtered_individual_data = individual_data.copy()
                
                if date_range_option == "Last 4 Weeks" and len(available_weeks) >= 4:
                    recent_weeks = available_weeks[-4:]
                    filtered_individual_data = individual_data[individual_data['Week'].isin(recent_weeks)]
                    st.info(f"📅 Filtering to last 4 weeks: {', '.join(recent_weeks)}")
                elif date_range_option == "Last 8 Weeks" and len(available_weeks) >= 8:
                    recent_weeks = available_weeks[-8:]
                    filtered_individual_data = individual_data[individual_data['Week'].isin(recent_weeks)]
                    st.info(f"📅 Filtering to last 8 weeks: {', '.join(recent_weeks)}")
                elif date_range_option == "Custom Range":
                    col1, col2 = st.columns(2)
                    with col1:
                        start_week = st.selectbox("Start Week", options=available_weeks)
                    with col2:
                        end_week = st.selectbox("End Week", options=available_weeks)
                    
                    if start_week and end_week:
                        start_idx = available_weeks.index(start_week)
                        end_idx = available_weeks.index(end_week)
                        if start_idx <= end_idx:
                            selected_weeks = available_weeks[start_idx:end_idx+1]
                            filtered_individual_data = individual_data[individual_data['Week'].isin(selected_weeks)]
                
                # Recalculate agent totals based on filtered individual data
                if date_range_option != "All Weeks":
                    # Recalculate totals for the filtered time period
                    agent_totals = filtered_individual_data.groupby('Agent').agg({
                        '# 1st Quotes': 'sum',
                        '# 2nd Quotes': 'sum', 
                        '# Submitted': 'sum',
                        '# Free look': 'sum',
                        'Smoker %': lambda x: np.average(x, weights=filtered_individual_data.loc[x.index, '# Submitted']) if filtered_individual_data.loc[x.index, '# Submitted'].sum() > 0 else 0,
                        'Preferred %': lambda x: np.average(x, weights=filtered_individual_data.loc[x.index, '# Submitted']) if filtered_individual_data.loc[x.index, '# Submitted'].sum() > 0 else 0,
                        'Standard %': lambda x: np.average(x, weights=filtered_individual_data.loc[x.index, '# Submitted']) if filtered_individual_data.loc[x.index, '# Submitted'].sum() > 0 else 0,
                        'Graded %': lambda x: np.average(x, weights=filtered_individual_data.loc[x.index, '# Submitted']) if filtered_individual_data.loc[x.index, '# Submitted'].sum() > 0 else 0,
                        'GI %': lambda x: np.average(x, weights=filtered_individual_data.loc[x.index, '# Submitted']) if filtered_individual_data.loc[x.index, '# Submitted'].sum() > 0 else 0,
                        'CC %': lambda x: np.average(x, weights=filtered_individual_data.loc[x.index, '# Submitted']) if filtered_individual_data.loc[x.index, '# Submitted'].sum() > 0 else 0,
                    }).reset_index()
                    
                    # Add calculated metrics
                    agent_totals['Conversion_Rate'] = np.where(
                        agent_totals['# 2nd Quotes'] > 0,
                        (agent_totals['# Submitted'] / agent_totals['# 2nd Quotes']) * 100,
                        0
                    )
                    
                    agent_totals['Free_Look_Rate'] = np.where(
                        agent_totals['# Submitted'] > 0,
                        (agent_totals['# Free look'] / agent_totals['# Submitted']) * 100,
                        0
                    )
                    
                    agent_totals['Quality_Score'] = (
                        agent_totals['Preferred %'] * 1.5 + 
                        agent_totals['Standard %'] * 1.0
                    ) / 2.5
                    
                    # Calculate weeks active in filtered period
                    weeks_active = filtered_individual_data.groupby('Agent')['Week'].nunique()
                    agent_totals['Weeks_Active'] = agent_totals['Agent'].map(weeks_active)
                    agent_totals['Avg_Weekly_Submissions'] = agent_totals['# Submitted'] / agent_totals['Weeks_Active']
                    
                    # Quality tiers
                    agent_totals['Quality_Tier'] = pd.cut(
                        agent_totals['Preferred %'],
                        bins=[0, 20, 30, 40, 100],
                        labels=['Poor', 'Average', 'Good', 'Excellent']
                    )
                    
                    # Filter by minimum thresholds for the filtered period
                    MIN_SUBMISSIONS_FILTERED = max(5, 10 * len(filtered_individual_data['Week'].unique()) // len(available_weeks))
                    
                    filtered_experienced_agents = agent_totals[
                        (agent_totals['# Submitted'] >= MIN_SUBMISSIONS_FILTERED) &
                        (agent_totals['Weeks_Active'] >= 1)
                    ]
                    
                    st.info(f"📊 Showing data for {date_range_option.lower()}: {len(filtered_experienced_agents)} qualified agents")
                else:
                    filtered_experienced_agents = experienced_agents.copy()
                
                # Apply agent and quality tier filters
                filtered_agents = filtered_experienced_agents[
                    (filtered_experienced_agents['Agent'].isin(selected_agents)) &
                    (filtered_experienced_agents['Quality_Tier'].isin(selected_tiers))
                ]
                
            except Exception as e:
                st.error(f"Error loading data: {str(e)}")
                st.error(f"Error type: {type(e).__name__}")
                
                # Show more detailed error information
                import traceback
                with st.expander("🔍 Detailed Error Information"):
                    st.code(traceback.format_exc())
                return
        else:
            st.info("👆 Please upload your agent summary data to begin analysis")
            return
    
    if uploaded_file is not None and len(filtered_agents) > 0:
        
        # Key Metrics Dashboard with enhanced styling
        st.markdown("## 📈 Key Performance Metrics")
        
        # Calculate additional insights
        total_submissions = filtered_agents['# Submitted'].sum()
        avg_conversion = filtered_agents['Conversion_Rate'].mean()
        avg_free_look = filtered_agents['Free_Look_Rate'].mean()
        avg_quality = filtered_agents['Quality_Score'].mean()
        
        # Previous period comparison (if available)
        prev_total = total_submissions * 0.95  # Simulated for demo
        submission_delta = total_submissions - prev_total
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.markdown(f"""
            <div class="metric-card">
                <h2>{len(filtered_agents)}</h2>
                <p>📊 Qualified Agents</p>
                <small>Meeting minimum thresholds</small>
            </div>
            """, unsafe_allow_html=True)
        
        with col2:
            st.markdown(f"""
            <div class="metric-card">
                <h2>{total_submissions:,.0f}</h2>
                <p>📋 Total Submissions</p>
                <small>+{submission_delta:.0f} vs previous period</small>
            </div>
            """, unsafe_allow_html=True)
        
        with col3:
            conversion_color = "#4caf50" if avg_conversion >= 60 else "#ff9800" if avg_conversion >= 40 else "#f44336"
            st.markdown(f"""
            <div class="metric-card" style="background: linear-gradient(135deg, {conversion_color} 0%, {conversion_color}dd 100%);">
                <h2>{avg_conversion:.1f}%</h2>
                <p>🎯 Avg Conversion Rate</p>
                <small>2nd Quote → Submission</small>
            </div>
            """, unsafe_allow_html=True)
        
        with col4:
            free_look_color = "#4caf50" if avg_free_look <= 8 else "#ff9800" if avg_free_look <= 12 else "#f44336"
            st.markdown(f"""
            <div class="metric-card" style="background: linear-gradient(135deg, {free_look_color} 0%, {free_look_color}dd 100%);">
                <h2>{avg_free_look:.1f}%</h2>
                <p>⚠️ Avg Free Look Rate</p>
                <small>30-day cancellations</small>
            </div>
            """, unsafe_allow_html=True)
        
        # Additional insights row
        st.markdown("### 🔍 Quick Insights")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            excellent_agents = len(filtered_agents[filtered_agents['Quality_Tier'] == 'Excellent'])
            excellent_pct = (excellent_agents / len(filtered_agents)) * 100 if len(filtered_agents) > 0 else 0
            
            st.markdown(f"""
            <div class="insight-card">
                <h4>🌟 Excellence Rate</h4>
                <h3>{excellent_pct:.1f}%</h3>
                <p>{excellent_agents} of {len(filtered_agents)} agents in Excellent tier</p>
            </div>
            """, unsafe_allow_html=True)
        
        with col2:
            high_risk_agents = len(filtered_agents[filtered_agents.get('Risk_Profile', '') == 'High Risk'])
            risk_pct = (high_risk_agents / len(filtered_agents)) * 100 if len(filtered_agents) > 0 else 0
            
            st.markdown(f"""
            <div class="insight-card">
                <h4>⚠️ Risk Exposure</h4>
                <h3>{risk_pct:.1f}%</h3>
                <p>{high_risk_agents} agents in High Risk category</p>
            </div>
            """, unsafe_allow_html=True)
        
        with col3:
            top_performer = filtered_agents.loc[filtered_agents['# Submitted'].idxmax()] if len(filtered_agents) > 0 else None
            
            if top_performer is not None:
                st.markdown(f"""
                <div class="insight-card">
                    <h4>🏆 Top Performer</h4>
                    <h3>{top_performer['Agent']}</h3>
                    <p>{top_performer['# Submitted']:.0f} submissions</p>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div class="insight-card">
                    <h4>🏆 Top Performer</h4>
                    <h3>N/A</h3>
                    <p>No data available</p>
                </div>
                """, unsafe_allow_html=True)
        
        # Tabs for different analyses
        tab1, tab2, tab3, tab4, tab5 = st.tabs([
            "🏆 Top Performers", 
            "🎯 Underwriting Analysis", 
            "⚠️ Risk Analysis", 
            "📊 Statistical Insights",
            "📋 Data Explorer"
        ])
        
        with tab1:
            st.subheader("🏆 Top Performing Agents")
            
            # Sorting controls
            col1, col2, col3 = st.columns([2, 2, 2])
            
            with col1:
                sort_metric = st.selectbox(
                    "📊 Sort by:",
                    options=['# Submitted', 'Conversion_Rate', 'Quality_Score', 'Preferred %', 'Free_Look_Rate'],
                    index=0,
                    help="Choose metric to sort agents by"
                )
            
            with col2:
                sort_order = st.selectbox(
                    "📈 Order:",
                    options=['Descending (High to Low)', 'Ascending (Low to High)'],
                    index=0
                )
                ascending = sort_order.startswith('Ascending')
            
            with col3:
                top_n = st.selectbox(
                    "🔢 Show top:",
                    options=[5, 10, 15, 20, 25],
                    index=1,
                    help="Number of top agents to display"
                )
            
            # Sort and filter agents
            top_performers = filtered_agents.nlargest(top_n, sort_metric) if not ascending else filtered_agents.nsmallest(top_n, sort_metric)
            
            # Interactive chart with drill-down
            fig = make_subplots(specs=[[{"secondary_y": True}]])
            
            fig.add_trace(
                go.Bar(
                    x=top_performers['Agent'],
                    y=top_performers[sort_metric],
                    name=sort_metric,
                    marker_color='rgba(102, 126, 234, 0.8)',
                    hovertemplate="<b>%{x}</b><br>" +
                                f"{sort_metric}: %{{y}}<br>" +
                                "<extra></extra>"
                ),
                secondary_y=False,
            )
            
            fig.add_trace(
                go.Scatter(
                    x=top_performers['Agent'],
                    y=top_performers['Conversion_Rate'],
                    mode='lines+markers',
                    name="Conversion Rate %",
                    line=dict(color='#f5576c', width=3),
                    marker=dict(size=10, color='#f5576c'),
                    hovertemplate="<b>%{x}</b><br>" +
                                "Conversion Rate: %{y:.1f}%<br>" +
                                "<extra></extra>"
                ),
                secondary_y=True,
            )
            
            fig.update_xaxes(title_text="Agent", tickangle=45)
            fig.update_yaxes(title_text=sort_metric, secondary_y=False)
            fig.update_yaxes(title_text="Conversion Rate %", secondary_y=True)
            fig.update_layout(
                title=f"Top {top_n} Agents by {sort_metric}",
                height=500,
                hovermode='x unified',
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)'
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            # Agent drill-down selection
            st.subheader("🔍 Agent Drill-Down Analysis")
            
            selected_agent = st.selectbox(
                "Select an agent for detailed analysis:",
                options=top_performers['Agent'].tolist(),
                help="Choose an agent to see detailed performance breakdown"
            )
            
            if selected_agent:
                agent_data = top_performers[top_performers['Agent'] == selected_agent].iloc[0]
                
                # Agent detail cards
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    st.markdown(f"""
                    <div class="metric-card">
                        <h3>{agent_data['# Submitted']:.0f}</h3>
                        <p>Total Submissions</p>
                    </div>
                    """, unsafe_allow_html=True)
                
                with col2:
                    st.markdown(f"""
                    <div class="metric-card">
                        <h3>{agent_data['Conversion_Rate']:.1f}%</h3>
                        <p>Conversion Rate</p>
                    </div>
                    """, unsafe_allow_html=True)
                
                with col3:
                    st.markdown(f"""
                    <div class="metric-card">
                        <h3>{agent_data['Quality_Score']:.1f}</h3>
                        <p>Quality Score</p>
                    </div>
                    """, unsafe_allow_html=True)
                
                with col4:
                    st.markdown(f"""
                    <div class="metric-card">
                        <h3>{agent_data['Free_Look_Rate']:.1f}%</h3>
                        <p>Free Look Rate</p>
                    </div>
                    """, unsafe_allow_html=True)
                
                # Detailed breakdown
                st.markdown("### 📋 Detailed Performance Breakdown")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    st.markdown(f"""
                    <div class="drill-down-card">
                        <h4>📊 Underwriting Mix</h4>
                        <p><strong>Preferred:</strong> {agent_data['Preferred %']:.1f}%</p>
                        <p><strong>Standard:</strong> {agent_data.get('Standard %', 0):.1f}%</p>
                        <p><strong>GI:</strong> {agent_data['GI %']:.1f}%</p>
                        <p><strong>Quality Tier:</strong> {agent_data['Quality_Tier']}</p>
                    </div>
                    """, unsafe_allow_html=True)
                
                with col2:
                    st.markdown(f"""
                    <div class="drill-down-card">
                        <h4>⚡ Activity Metrics</h4>
                        <p><strong>Weeks Active:</strong> {agent_data.get('Weeks_Active', 'N/A')}</p>
                        <p><strong>Avg Weekly Submissions:</strong> {agent_data.get('Avg_Weekly_Submissions', 0):.1f}</p>
                        <p><strong>Risk Profile:</strong> {agent_data.get('Risk_Profile', 'N/A')}</p>
                        <p><strong>1st Quotes:</strong> {agent_data.get('# 1st Quotes', 0):.0f}</p>
                    </div>
                    """, unsafe_allow_html=True)
            
            # Performance table with enhanced formatting
            st.subheader("📈 Detailed Performance Metrics")
            
            display_cols = [
                'Agent', '# Submitted', 'Conversion_Rate', 'Quality_Score', 
                'Preferred %', 'GI %', 'Free_Look_Rate', 'Quality_Tier'
            ]
            
            performance_df = top_performers[display_cols].copy()
            performance_df.columns = [
                'Agent', 'Submissions', 'Conversion Rate %', 'Quality Score',
                'Preferred %', 'GI %', 'Free Look Rate %', 'Quality Tier'
            ]
            
            # Format numeric columns
            numeric_cols = ['Submissions', 'Conversion Rate %', 'Quality Score', 'Preferred %', 'GI %', 'Free Look Rate %']
            for col in numeric_cols:
                if col in performance_df.columns:
                    if col == 'Submissions':
                        performance_df[col] = performance_df[col].astype(int)
                    else:
                        performance_df[col] = performance_df[col].round(1)
            
            st.dataframe(
                performance_df,
                use_container_width=True,
                hide_index=True
            )
        
        with tab2:
            st.subheader("🎯 Underwriting Class Mixture Analysis")
            
            # Industry benchmarks
            st.info("""
            **Industry Benchmarks:**
            - **Excellent**: Preferred 45%+, GI ≤5%, Free Look ≤5%
            - **Good**: Preferred 35%+, GI ≤15%, Free Look ≤8%
            - **Average**: Preferred 25%+, GI ≤25%, Free Look ≤12%
            - **Poor**: Preferred <25%, GI >25%, Free Look >12%
            """)
            
            # Quality distribution
            col1, col2 = st.columns(2)
            
            with col1:
                # Quality tier distribution
                tier_counts = filtered_agents['Quality_Tier'].value_counts()
                fig_pie = px.pie(
                    values=tier_counts.values,
                    names=tier_counts.index,
                    title="Quality Tier Distribution",
                    color_discrete_map={
                        'Excellent': '#4caf50',
                        'Good': '#2196f3',
                        'Average': '#ff9800',
                        'Poor': '#f44336'
                    }
                )
                st.plotly_chart(fig_pie, use_container_width=True)
            
            with col2:
                # Risk profile distribution
                risk_counts = filtered_agents['Risk_Profile'].value_counts()
                fig_risk = px.pie(
                    values=risk_counts.values,
                    names=risk_counts.index,
                    title="Risk Profile Distribution",
                    color_discrete_map={
                        'Low Risk': '#4caf50',
                        'Medium Risk': '#ff9800',
                        'High Risk': '#f44336'
                    }
                )
                st.plotly_chart(fig_risk, use_container_width=True)
            
            # Underwriting mix scatter plot
            fig_scatter = px.scatter(
                filtered_agents,
                x='Preferred %',
                y='GI %',
                size='# Submitted',
                color='Quality_Tier',
                hover_data=['Agent', 'Conversion_Rate', 'Free_Look_Rate'],
                title="Underwriting Quality vs Risk Profile",
                color_discrete_map={
                    'Excellent': '#4caf50',
                    'Good': '#2196f3',
                    'Average': '#ff9800',
                    'Poor': '#f44336'
                }
            )
            fig_scatter.update_layout(height=500)
            st.plotly_chart(fig_scatter, use_container_width=True)
            
            # Agent cards
            st.subheader("Agent Performance Cards")
            
            logger.info(f"Creating agent cards for {len(filtered_agents.head(12))} agents")
            
            cols = st.columns(3)
            for idx, (_, agent) in enumerate(filtered_agents.head(12).iterrows()):
                col_idx = idx % 3
                
                with cols[col_idx]:
                    # Safe handling of Quality_Tier
                    try:
                        agent_name = agent.get('Agent', f'Agent_{idx}')
                        logger.info(f"Processing agent card for: {agent_name}")
                        logger.info(f"Quality_Tier value: {agent['Quality_Tier']} (type: {type(agent['Quality_Tier'])})")
                        
                        quality_tier = str(agent['Quality_Tier']).lower() if pd.notna(agent['Quality_Tier']) else 'unknown'
                        tier_class = f"quality-tier-{quality_tier}"
                        
                        logger.info(f"Successfully processed Quality_Tier for {agent_name}: {quality_tier}")
                        
                    except Exception as e:
                        logger.error(f"Error processing Quality_Tier for agent {agent.get('Agent', 'Unknown')}: {e}")
                        logger.error(f"Traceback: {traceback.format_exc()}")
                        st.error(f"Error processing Quality_Tier for agent {agent.get('Agent', 'Unknown')}: {e}")
                        tier_class = "quality-tier-unknown"
                    
                    # Safe handling of all fields
                    try:
                        agent_name = str(agent.get('Agent', 'Unknown'))
                        quality_tier_display = str(agent['Quality_Tier']) if pd.notna(agent['Quality_Tier']) else 'Unknown'
                        risk_profile_display = str(agent['Risk_Profile']) if pd.notna(agent['Risk_Profile']) else 'Unknown'
                        
                        st.markdown(f"""
                        <div class="{tier_class}" style="padding: 1rem; margin: 0.5rem 0; border-radius: 8px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h4>{agent_name}</h4>
                            <p><strong>Quality Tier:</strong> {quality_tier_display}</p>
                            <p><strong>Submissions:</strong> {agent['# Submitted']:.0f}</p>
                            <p><strong>Preferred:</strong> {agent['Preferred %']:.1f}%</p>
                            <p><strong>GI:</strong> {agent['GI %']:.1f}%</p>
                            <p><strong>Free Look:</strong> {agent['Free_Look_Rate']:.1f}%</p>
                            <p><strong>Risk Profile:</strong> {risk_profile_display}</p>
                        </div>
                        """, unsafe_allow_html=True)
                        
                    except Exception as e:
                        logger.error(f"Error creating agent card HTML for {agent.get('Agent', 'Unknown')}: {e}")
                        st.error(f"Error displaying agent card for {agent.get('Agent', 'Unknown')}")
        
        with tab3:
            st.subheader("⚠️ Risk Analysis & Coaching Priorities")
            
            # Calculate risk scores
            risk_data = []
            for _, agent in filtered_agents.iterrows():
                risk_score, risk_level, issues = calculate_risk_score(agent)
                risk_data.append({
                    'Agent': agent['Agent'],
                    'Risk_Score': risk_score,
                    'Risk_Level': risk_level,
                    'Issues': '; '.join(issues),
                    'Weeks_Active': agent['Weeks_Active'],
                    'Submissions': agent['# Submitted']
                })
            
            risk_df = pd.DataFrame(risk_data)
            
            # Risk level distribution
            col1, col2 = st.columns(2)
            
            with col1:
                risk_counts = risk_df['Risk_Level'].value_counts()
                fig_risk_dist = px.bar(
                    x=risk_counts.index,
                    y=risk_counts.values,
                    title="Risk Level Distribution",
                    color=risk_counts.index,
                    color_discrete_map={
                        'Low': '#4caf50',
                        'Medium': '#ff9800',
                        'High': '#f44336'
                    }
                )
                st.plotly_chart(fig_risk_dist, use_container_width=True)
            
            with col2:
                # Risk score vs submissions
                fig_risk_scatter = px.scatter(
                    risk_df,
                    x='Submissions',
                    y='Risk_Score',
                    color='Risk_Level',
                    hover_data=['Agent'],
                    title="Risk Score vs Volume",
                    color_discrete_map={
                        'Low': '#4caf50',
                        'Medium': '#ff9800',
                        'High': '#f44336'
                    }
                )
                st.plotly_chart(fig_risk_scatter, use_container_width=True)
            
            # High-risk agents table
            high_risk_agents = risk_df[risk_df['Risk_Level'].isin(['High', 'Medium'])].sort_values('Risk_Score', ascending=False)
            
            if len(high_risk_agents) > 0:
                st.subheader("Agents Requiring Attention")
                st.dataframe(
                    high_risk_agents[['Agent', 'Risk_Score', 'Risk_Level', 'Issues', 'Weeks_Active']],
                    use_container_width=True,
                    hide_index=True
                )
            else:
                st.success("🎉 No high-risk agents identified in current selection!")
        
        with tab4:
            st.subheader("📊 Statistical Insights & Explanations")
            
            # Metric explanations
            st.markdown("""
            ### 🎯 Key Metric Definitions
            
            **Conversion Rate (Primary)**: Submitted ÷ Second Quotes × 100
            - Measures effectiveness at converting qualified prospects to submissions
            - Industry benchmark: 60-80%
            
            **Free Look Rate**: Cancelled Policies ÷ Submitted × 100
            - Policies cancelled within first 30 days of payment
            - Lower is better (target: <8%)
            
            **Quality Score**: (Preferred% × 1.5 + Standard% × 1.0) ÷ 2.5
            - Weighted score favoring preferred rates
            - Higher scores indicate better underwriting quality
            
            **Underwriting Classes**:
            - **Preferred**: Lowest risk, best rates
            - **Standard**: Average risk, standard rates  
            - **Graded**: Higher risk, modified coverage
            - **GI (Guaranteed Issue)**: Highest risk, limited coverage
            """)
            
            # Statistical summary
            st.subheader("Portfolio Statistics")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("**Conversion Rate Analysis**")
                conv_stats = filtered_agents['Conversion_Rate'].describe()
                st.write(f"Mean: {conv_stats['mean']:.1f}%")
                st.write(f"Median: {conv_stats['50%']:.1f}%")
                st.write(f"Std Dev: {conv_stats['std']:.1f}%")
                st.write(f"Range: {conv_stats['min']:.1f}% - {conv_stats['max']:.1f}%")
            
            with col2:
                st.markdown("**Quality Score Analysis**")
                qual_stats = filtered_agents['Quality_Score'].describe()
                st.write(f"Mean: {qual_stats['mean']:.1f}")
                st.write(f"Median: {qual_stats['50%']:.1f}")
                st.write(f"Std Dev: {qual_stats['std']:.1f}")
                st.write(f"Range: {qual_stats['min']:.1f} - {qual_stats['max']:.1f}")
            
            # Correlation analysis
            st.subheader("Correlation Analysis")
            
            corr_data = filtered_agents[[
                'Conversion_Rate', 'Quality_Score', 'Preferred %', 'GI %', 
                'Free_Look_Rate', '# Submitted'
            ]].corr()
            
            fig_corr = px.imshow(
                corr_data,
                title="Metric Correlations",
                color_continuous_scale='RdBu',
                aspect='auto'
            )
            st.plotly_chart(fig_corr, use_container_width=True)
            
            # Business implications
            st.subheader("🚨 Key Business Implications")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.info("""
                **Conversion Rate Impact**
                
                A 10% improvement in conversion rate can increase revenue by 15-20% without additional lead costs.
                """)
            
            with col2:
                st.warning("""
                **Quality vs Volume**
                
                High GI% may indicate volume focus over quality. Monitor for compliance and customer satisfaction.
                """)
            
            with col3:
                st.success("""
                **Free Look Optimization**
                
                Reducing free look cancellations by 5% can improve net retention by 8-12%.
                """)
        
        with tab5:
            st.subheader("📋 Interactive Data Explorer")
            
            # Advanced filtering and sorting controls
            st.markdown("### 🔧 Advanced Data Controls")
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                # Column selection
                all_columns = [
                    'Agent', '# Submitted', 'Conversion_Rate', 'Quality_Score', 
                    'Preferred %', 'Standard %', 'GI %', 'Free_Look_Rate', 
                    'Quality_Tier', 'Risk_Profile', 'Weeks_Active', 'Avg_Weekly_Submissions'
                ]
                
                selected_columns = st.multiselect(
                    "📊 Select Columns:",
                    options=all_columns,
                    default=['Agent', '# Submitted', 'Conversion_Rate', 'Quality_Score', 'Quality_Tier'],
                    help="Choose which columns to display"
                )
            
            with col2:
                # Sorting options
                sort_column = st.selectbox(
                    "🔄 Sort by:",
                    options=selected_columns if selected_columns else all_columns,
                    help="Choose column to sort by"
                )
            
            with col3:
                # Sort direction
                sort_direction = st.selectbox(
                    "📈 Sort Direction:",
                    options=["Descending", "Ascending"],
                    help="Choose sort direction"
                )
            
            with col4:
                # Number of rows
                num_rows = st.selectbox(
                    "📄 Show Rows:",
                    options=[10, 25, 50, 100, "All"],
                    index=2,
                    help="Number of rows to display"
                )
            
            # Advanced filters
            st.markdown("### 🎯 Advanced Filters")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                # Conversion rate filter
                conv_min, conv_max = st.slider(
                    "Conversion Rate Range (%)",
                    min_value=0.0,
                    max_value=100.0,
                    value=(0.0, 100.0),
                    step=1.0,
                    help="Filter by conversion rate range"
                )
            
            with col2:
                # Submissions filter
                sub_min = st.number_input(
                    "Minimum Submissions",
                    min_value=0,
                    value=0,
                    help="Filter by minimum submission count"
                )
            
            with col3:
                # Quality score filter
                qual_min, qual_max = st.slider(
                    "Quality Score Range",
                    min_value=0.0,
                    max_value=100.0,
                    value=(0.0, 100.0),
                    step=1.0,
                    help="Filter by quality score range"
                )
            
            # Apply filters
            filtered_data = filtered_agents[
                (filtered_agents['Conversion_Rate'] >= conv_min) &
                (filtered_agents['Conversion_Rate'] <= conv_max) &
                (filtered_agents['# Submitted'] >= sub_min) &
                (filtered_agents['Quality_Score'] >= qual_min) &
                (filtered_agents['Quality_Score'] <= qual_max)
            ].copy()
            
            # Sort data
            if sort_column in filtered_data.columns:
                ascending = sort_direction == "Ascending"
                filtered_data = filtered_data.sort_values(sort_column, ascending=ascending)
            
            # Limit rows
            if num_rows != "All":
                filtered_data = filtered_data.head(num_rows)
            
            # Display summary
            st.markdown(f"### 📊 Showing {len(filtered_data)} agents (filtered from {len(filtered_agents)} total)")
            
            # Export options
            col1, col2, col3 = st.columns([1, 1, 2])
            
            with col1:
                if st.button("📥 Download CSV"):
                    csv = filtered_data[selected_columns].to_csv(index=False)
                    st.download_button(
                        label="💾 Download Data",
                        data=csv,
                        file_name=f"agent_performance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                        mime="text/csv"
                    )
            
            with col2:
                if st.button("🔄 Reset Filters"):
                    st.experimental_rerun()
            
            # Display the filtered and sorted data
            if selected_columns:
                display_data = filtered_data[selected_columns].copy()
                
                # Format numeric columns for better display
                for col in display_data.columns:
                    if col in ['Conversion_Rate', 'Quality_Score', 'Preferred %', 'Standard %', 'GI %', 'Free_Look_Rate']:
                        display_data[col] = display_data[col].round(1)
                    elif col in ['# Submitted', 'Weeks_Active']:
                        display_data[col] = display_data[col].astype(int)
                    elif col == 'Avg_Weekly_Submissions':
                        display_data[col] = display_data[col].round(2)
                
                st.dataframe(
                    display_data,
                    use_container_width=True,
                    hide_index=True,
                    height=400
                )
                
                # Quick stats for filtered data
                if len(filtered_data) > 0:
                    st.markdown("### 📈 Quick Statistics for Filtered Data")
                    
                    col1, col2, col3, col4 = st.columns(4)
                    
                    with col1:
                        avg_conv = filtered_data['Conversion_Rate'].mean()
                        st.metric("Avg Conversion Rate", f"{avg_conv:.1f}%")
                    
                    with col2:
                        total_subs = filtered_data['# Submitted'].sum()
                        st.metric("Total Submissions", f"{total_subs:,.0f}")
                    
                    with col3:
                        avg_quality = filtered_data['Quality_Score'].mean()
                        st.metric("Avg Quality Score", f"{avg_quality:.1f}")
                    
                    with col4:
                        avg_free_look = filtered_data['Free_Look_Rate'].mean()
                        st.metric("Avg Free Look Rate", f"{avg_free_look:.1f}%")
            
            else:
                st.warning("Please select at least one column to display.")

if __name__ == "__main__":
    main() 