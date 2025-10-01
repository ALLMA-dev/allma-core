// packages/allma-admin-shell/src/components/ErrorBoundary.tsx

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Container, Title, Text, Button, Paper, Code } from '@mantine/core';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.assign(window.location.origin);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Container size="sm" style={{ textAlign: 'center', paddingTop: '5rem' }}>
          <Paper shadow="md" p="xl" withBorder>
            <Title order={1} c="red.7" mb="md">Oops! Something went wrong.</Title>
            <Text mb="md">An unexpected error occurred. Please try reloading the page.</Text>
            {this.state.error && <Code block mb="lg">{this.state.error.message}</Code>}
            <Button onClick={this.handleReset} color="red">Reload Page</Button>
          </Paper>
        </Container>
      );
    }
    return this.props.children;
  }
}