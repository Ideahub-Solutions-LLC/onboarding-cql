# Monitoring and alerting plan

## Service objectives

- Availability: 99.9% of homepage and health checks succeed over 30 days.
- Correctness: 99.9% of `/api/health` checks return 200 with configuration and storage healthy.
- Performance: 95% of health checks complete within 2 seconds, reviewed after a 30-day baseline.
- Errors: production 5xx rate remains below 1% over any five-minute window.

## Checks

- Run `npm run monitor` every 1–5 minutes from at least two regions.
- Monitor DNS resolution and certificate expiry.
- Alert after two consecutive health-check failures.
- Alert on authentication email failures, database failures, or a 5xx rate above 1% for five minutes.
- Notify during business hours when p95 latency doubles from its rolling baseline.
- Review CSP reports and unusual audit-event volume weekly.

## Routing and runbook

- Page: site unavailable, health unhealthy, repeated login failure, or security alert. Notify the named on-call owner; escalate after 10 minutes.
- Notify: performance regression, repeated login failures, or increasing storage usage.
- Log: individual user validation failures and isolated CSP reports.

Initial response: check application logs, `/api/health`, SQLite storage, and recent audit events. Roll back the deployment if a release caused the failure. Review thresholds quarterly.

External uptime and alert-routing providers must be configured by an administrator; this repository supplies the health contract and monitor command.

