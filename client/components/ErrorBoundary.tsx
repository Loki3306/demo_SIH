import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to monitoring service (in production)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In production, this would send to an error monitoring service
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      console.error('Error logged:', errorData);
      
      // Example: Send to monitoring service
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData)
      // }).catch(() => {});
      
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  };

  private handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: undefined
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private getErrorSeverity = (error: Error): 'low' | 'medium' | 'high' => {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    // High severity errors
    if (
      message.includes('blockchain') ||
      message.includes('authentication') ||
      message.includes('network') ||
      stack.includes('chunkloaderror')
    ) {
      return 'high';
    }
    
    // Medium severity errors
    if (
      message.includes('permission') ||
      message.includes('timeout') ||
      message.includes('fetch')
    ) {
      return 'medium';
    }
    
    return 'low';
  };

  private getUserFriendlyMessage = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('blockchain')) {
      return 'Blockchain service is temporarily unavailable. Some features may be limited.';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    if (message.includes('permission')) {
      return 'Permission denied. Please ensure you have the necessary access rights.';
    }
    
    if (message.includes('chunkloaderror')) {
      return 'Failed to load application resources. Please refresh the page.';
    }
    
    return 'An unexpected error occurred. Our team has been notified.';
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const severity = error ? this.getErrorSeverity(error) : 'medium';
      const userMessage = error ? this.getUserFriendlyMessage(error) : 'An unexpected error occurred.';
      
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">
                {severity === 'high' ? 'Service Unavailable' :
                 severity === 'medium' ? 'Something Went Wrong' :
                 'Minor Issue Detected'}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6"> 
              <Alert variant={severity === 'high' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {userMessage}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4"> 
                <div className="flex flex-col sm:flex-row gap-3"> 
                  <Button 
                    onClick={this.handleRetry}
                    className="flex-1"
                    variant="default"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  
                  <Button 
                    onClick={this.handleReload}
                    className="flex-1"
                    variant="outline"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Page
                  </Button>
                  
                  <Button 
                    onClick={this.handleGoHome}
                    className="flex-1"
                    variant="outline"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                </div>
                
                {/* Error Details (for debugging) */}
                  {process.env.NODE_ENV === 'development' && error && (
                  <details className="mt-6 p-4 bg-muted rounded-lg">
                    <summary className="cursor-pointer font-medium flex items-center gap-2">
                      <Bug className="w-4 h-4" />
                      Technical Details (Development Mode)
                    </summary>
                    <div className="mt-4 space-y-2">
                      <div>
                        <strong>Error ID:</strong> {this.state.errorId}
                      </div>
                      <div>
                        <strong>Message:</strong> {error.message}
                      </div>
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto max-h-40"> 
                          {error.stack}
                        </pre>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto max-h-40"> 
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
                
                {/* Production Error ID */}
                {process.env.NODE_ENV === 'production' && this.state.errorId && (
                  <div className="text-center text-xs text-muted-foreground mt-4">
                    Error ID: {this.state.errorId}
                    <br />
                    Please provide this ID when contacting support.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// HOC for easy wrapping of components
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  
  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundaryComponent;
}

// Hook for manually reporting errors
export const useErrorHandler = () => {
  const reportError = (error: Error, context?: string) => {
    console.error(`Manual error report${context ? ` (${context})` : ''}:`, error);
    
    // Report to monitoring service
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        manual: true
      };
      
      // In production, send to monitoring service
      console.error('Manual error logged:', errorData);
      
    } catch (logError) {
      console.error('Failed to log manual error:', logError);
    }
  };
  
  return { reportError };
};