function Dashboard() {
  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Good Morning, Admin!</h1>

          <p>
            Here's what's happening with your business today.
          </p>
        </div>

        <div className="date-selector">
          📅 &nbsp; 01 Dec 2024 - 31 Dec 2024
        </div>
      </div>

      <div className="dashboard-cards">
        <div className="dashboard-card">
          <span>Total Sales</span>
          <strong>₹12,45,800</strong>
          <small className="success-text">↑ 12.5% vs last month</small>
        </div>

        <div className="dashboard-card">
          <span>Total Purchase</span>
          <strong>₹8,32,600</strong>
          <small className="danger-text">↓ 4.2% vs last month</small>
        </div>

        <div className="dashboard-card">
          <span>Total Receivables</span>
          <strong>₹3,18,400</strong>
          <small className="success-text">↑ 8.1% vs last month</small>
        </div>

        <div className="dashboard-card">
          <span>Total Payables</span>
          <strong>₹2,41,200</strong>
          <small className="danger-text">↓ 6.3% vs last month</small>
        </div>
      </div>

      <div className="welcome-card">
        <h2>Welcome to TrustIQ ERP</h2>

        <p>
          Your ERP dashboard is ready. Business modules will be
          added here step by step.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;