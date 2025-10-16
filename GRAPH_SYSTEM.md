# AI Wallet Insights - Visual Analytics System

## Overview

The Visual Analytics system allows users to request beautiful, interactive graphs and diagrams through natural language. The AI automatically chooses appropriate visualizations and generates real-time charts based on blockchain data.

## Available Graph Types

### 1. Horizontal Bar Chart (HBC)
- **Best for**: Comparing categories, top addresses, contract usage rankings
- **Use cases**: "Show top recipients", "Most active contracts", "Highest transaction amounts"

### 2. Vertical Bar Chart (VBC)  
- **Best for**: Time series data, monthly/daily counts, categorical comparisons
- **Use cases**: "Monthly activity", "Daily transactions", "Transaction counts by type"

### 3. Pie Chart (PG)
- **Best for**: Showing proportions and percentages, part-to-whole relationships
- **Use cases**: "Transaction type breakdown", "Balance distribution", "Contract usage percentage"

### 4. Line Chart (LC)
- **Best for**: Trends over time, continuous data, balance changes
- **Use cases**: "Balance over time", "Activity trends", "Monthly progression"

### 5. Area Chart (AC)
- **Best for**: Cumulative data, filled trend visualization, volume over time
- **Use cases**: "Cumulative transactions", "Total volume over time", "Growing balances"

### 6. Donut Chart (DG)
- **Best for**: Modern proportional data with center focus, key metrics
- **Use cases**: "Transaction distribution with total", "Percentage breakdown with summary"

## Graph Protocol Format

```json
{
  "graph": "HBC|VBC|PG|LC|AC|DG",
  "x_axis_data": ["Label1", "Label2", "Label3"],
  "y_axis_data": [100, 200, 150],
  "title": "Chart Title",
  "subtitle": "Optional subtitle for additional context",
  "colors": ["#3b82f6", "#8b5cf6", "#ec4899"],
  "text": "Optional explanation text displayed below the graph"
}
```

## Protocol Fields

### Required Fields
- **graph**: Graph type code (HBC, VBC, PG, LC, AC, DG)
- **x_axis_data**: Array of string labels for categories/time periods
- **y_axis_data**: Array of numbers corresponding to each label
- **title**: Clear, descriptive title for the visualization

### Optional Fields
- **subtitle**: Additional context or description
- **colors**: Array of hex color codes for customization
- **text**: Explanatory text shown below the graph

## Color Themes

### Default Gradient
```json
["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#6366f1"]
```

### Stacks Theme
```json
["#5546ff", "#00d4ff", "#ff6b35"]
```

### Blue Theme
```json
["#3b82f6", "#1d4ed8", "#60a5fa", "#93c5fd", "#dbeafe"]
```

### Purple Theme
```json
["#8b5cf6", "#7c3aed", "#a78bfa", "#c4b5fd", "#ddd6fe"]
```

## Example Implementations

### Monthly Transaction Activity
```json
{
  "graph": "VBC",
  "x_axis_data": ["Jan", "Feb", "Mar", "Apr", "May"],
  "y_axis_data": [45, 67, 23, 89, 34],
  "title": "Monthly Transaction Activity",
  "subtitle": "Transactions per month",
  "colors": ["#3b82f6", "#1d4ed8", "#60a5fa", "#93c5fd", "#dbeafe"],
  "text": "Peak activity was in April with 89 transactions. Overall trend shows variable monthly usage."
}
```

### Transaction Type Breakdown
```json
{
  "graph": "PG",
  "x_axis_data": ["Token Transfer", "Contract Call", "Smart Contract"],
  "y_axis_data": [150, 45, 5],
  "title": "Transaction Type Distribution",
  "colors": ["#10b981", "#f59e0b", "#ef4444"],
  "text": "Token transfers dominate at 75% of all transactions, indicating active STX movement."
}
```

### Top Recipients Analysis
```json
{
  "graph": "HBC",
  "x_axis_data": ["ST1ABC...DEF", "ST2GHI...JKL", "ST3MNO...PQR"],
  "y_axis_data": [25, 18, 12],
  "title": "Top STX Recipients",
  "subtitle": "By transaction count",
  "colors": ["#8b5cf6", "#a78bfa", "#c4b5fd"],
  "text": "ST1ABC...DEF received the most transactions (25), suggesting it might be an exchange address."
}
```

## User Interaction Examples

### Simple Requests
- "Show me a chart of monthly activity"
- "Create a pie chart of transaction types"
- "Draw a bar chart of top recipients"

### Complex Requests
- "Give me October activities with a visual breakdown"
- "Show me a 3-month summary with diagrams"
- "Create a trend analysis of balance changes"

## AI Workflow for Graph Generation

### For Simple Data (Current Context)
1. User asks for visualization
2. AI analyzes available data
3. AI responds with graph protocol JSON
4. Frontend renders the graph

### For Complex Data (Requires Fetching)
1. User asks for visualization requiring more data
2. AI uses Pro Agent Mode to fetch comprehensive data
3. AI processes aggregated data with custom code
4. AI responds with graph protocol JSON including analysis
5. Frontend renders graph with explanatory text

## Technical Implementation

### Frontend Components
- **GraphRenderer.tsx**: Main component handling all graph types
- **GraphDemo.tsx**: Interactive demo showing capabilities
- **ChatInterface.tsx**: Handles graph protocol parsing and rendering

### Data Processing
- Automatic animation and transitions
- Responsive design for all screen sizes
- Interactive legends and tooltips
- Color customization support

### Integration Points
- Seamless integration with Agent Mode
- Real-time data fetching and processing
- Natural language to visualization conversion
- Contextual explanations with each graph

## Best Practices

### For AI Responses
- Choose appropriate graph type for data structure
- Use meaningful, concise labels
- Provide insightful explanatory text
- Round numbers appropriately
- Truncate long addresses (ST1ABC...XYZ format)

### For Data Preparation
- Ensure x_axis_data and y_axis_data arrays have equal length
- Sort data meaningfully (chronological, by value, etc.)
- Limit categories to maintain readability (max 10-12 items)
- Use consistent color schemes for related data

### For User Experience
- Always include descriptive titles
- Provide context through subtitles when helpful
- Use explanatory text to highlight insights
- Choose colors that provide good contrast
- Ensure accessibility with clear labels

## Future Enhancements

### Planned Features
- Interactive hover tooltips
- Drill-down capabilities
- Export functionality (PNG, SVG)
- Animation speed controls
- Custom color picker interface

### Advanced Visualizations
- Scatter plots for correlation analysis
- Heatmaps for activity patterns
- Network graphs for address relationships
- Candlestick charts for price data
- Sankey diagrams for flow analysis

This visual analytics system transforms complex blockchain data into intuitive, beautiful visualizations that help users understand wallet behavior, transaction patterns, and blockchain activity at a glance.