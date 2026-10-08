import { Component } from "react";
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <div style={{ padding: 32, fontFamily: "system-ui" }}>
        <h1>Something didn’t load.</h1>
        <p>Your demo data is still in this browser. Reload to try again.</p>
        <button onClick={() => window.location.reload()}>Reload app</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
