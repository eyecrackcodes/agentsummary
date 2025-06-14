import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
from datetime import datetime
import io

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
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
        text-align: center;
        margin: 0.5rem 0;
    }
    .quality-tier-excellent { border-left: 5px solid #4caf50; }
    .quality-tier-good { border-left: 5px solid #2196f3; }
    .quality-tier-average { border-left: 5px solid #ff9800; }
    .quality-tier-poor { border-left: 5px solid #f44336; }
</style>
""", unsafe_allow_html=True)

# Data processing functions
@st.cache_data
def process_agent_data(df):
    """Process uploaded agent data and calculate metrics"""
    
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
    experienced_agents['Quality_Tier'] = pd.cut(
        experienced_agents['Preferred %'],
        bins=[0, 20, 30, 40, 100],
        labels=['Poor', 'Average', 'Good', 'Excellent']
    )
    
    # Risk profiles
    experienced_agents['Risk_Profile'] = pd.cut(
        experienced_agents['GI %'],
        bins=[0, 20, 35, 100],
        labels=['Low Risk', 'Medium Risk', 'High Risk']
    )
    
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
                if uploaded_file.name.endswith('.csv'):
                    df = pd.read_csv(uploaded_file)
                else:
                    df = pd.read_excel(uploaded_file, sheet_name='agent summary')
                
                st.success(f"✅ Loaded {len(df)} records")
                
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
                
                # Get available weeks for filtering
                available_weeks = sorted(individual_data['Week'].unique())
                
                # Apply date range filtering to individual data
                filtered_individual_data = individual_data.copy()
                
                if date_range_option == "Last 4 Weeks" and len(available_weeks) >= 4:
                    recent_weeks = available_weeks[-4:]
                    filtered_individual_data = individual_data[individual_data['Week'].isin(recent_weeks)]
                elif date_range_option == "Last 8 Weeks" and len(available_weeks) >= 8:
                    recent_weeks = available_weeks[-8:]
                    filtered_individual_data = individual_data[individual_data['Week'].isin(recent_weeks)]
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
                return
        else:
            st.info("👆 Please upload your agent summary data to begin analysis")
            return
    
    if uploaded_file is not None and len(filtered_agents) > 0:
        
        # Key Metrics Dashboard
        st.header("📈 Key Performance Metrics")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Qualified Agents",
                len(filtered_agents),
                help="Agents meeting minimum data thresholds"
            )
        
        with col2:
            total_submissions = filtered_agents['# Submitted'].sum()
            st.metric(
                "Total Submissions",
                f"{total_submissions:,}",
                help="Total submissions from qualified agents"
            )
        
        with col3:
            avg_conversion = filtered_agents['Conversion_Rate'].mean()
            st.metric(
                "Avg Conversion Rate",
                f"{avg_conversion:.1f}%",
                help="Average conversion rate (2nd Quote → Submission)"
            )
        
        with col4:
            avg_free_look = filtered_agents['Free_Look_Rate'].mean()
            st.metric(
                "Avg Free Look Rate",
                f"{avg_free_look:.1f}%",
                help="Average cancellation rate within 30 days"
            )
        
        # Tabs for different analyses
        tab1, tab2, tab3, tab4 = st.tabs([
            "🏆 Top Performers", 
            "🎯 Underwriting Analysis", 
            "⚠️ Risk Analysis", 
            "📊 Statistical Insights"
        ])
        
        with tab1:
            st.subheader("Top Performing Agents")
            
            # Top performers chart
            top_performers = filtered_agents.nlargest(10, '# Submitted')
            
            fig = make_subplots(specs=[[{"secondary_y": True}]])
            
            fig.add_trace(
                go.Bar(
                    x=top_performers['Agent'],
                    y=top_performers['# Submitted'],
                    name="Submissions",
                    marker_color='lightblue'
                ),
                secondary_y=False,
            )
            
            fig.add_trace(
                go.Scatter(
                    x=top_performers['Agent'],
                    y=top_performers['Conversion_Rate'],
                    mode='lines+markers',
                    name="Conversion Rate %",
                    line=dict(color='red', width=3),
                    marker=dict(size=8)
                ),
                secondary_y=True,
            )
            
            fig.update_xaxes(title_text="Agent", tickangle=45)
            fig.update_yaxes(title_text="Submissions", secondary_y=False)
            fig.update_yaxes(title_text="Conversion Rate %", secondary_y=True)
            fig.update_layout(
                title="Top Performers: Submissions vs Conversion Rate",
                height=500
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            # Performance table
            st.subheader("Detailed Performance Metrics")
            display_cols = [
                'Agent', '# Submitted', 'Conversion_Rate', 'Quality_Score', 
                'Preferred %', 'GI %', 'Free_Look_Rate', 'Quality_Tier'
            ]
            
            performance_df = top_performers[display_cols].copy()
            performance_df.columns = [
                'Agent', 'Submissions', 'Conversion Rate %', 'Quality Score',
                'Preferred %', 'GI %', 'Free Look Rate %', 'Quality Tier'
            ]
            
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
            
            cols = st.columns(3)
            for idx, (_, agent) in enumerate(filtered_agents.head(12).iterrows()):
                col_idx = idx % 3
                
                with cols[col_idx]:
                    tier_class = f"quality-tier-{agent['Quality_Tier'].lower()}"
                    
                    st.markdown(f"""
                    <div class="{tier_class}" style="padding: 1rem; margin: 0.5rem 0; border-radius: 8px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h4>{agent['Agent']}</h4>
                        <p><strong>Quality Tier:</strong> {agent['Quality_Tier']}</p>
                        <p><strong>Submissions:</strong> {agent['# Submitted']}</p>
                        <p><strong>Preferred:</strong> {agent['Preferred %']:.1f}%</p>
                        <p><strong>GI:</strong> {agent['GI %']:.1f}%</p>
                        <p><strong>Free Look:</strong> {agent['Free_Look_Rate']:.1f}%</p>
                        <p><strong>Risk Profile:</strong> {agent['Risk_Profile']}</p>
                    </div>
                    """, unsafe_allow_html=True)
        
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

if __name__ == "__main__":
    main() 