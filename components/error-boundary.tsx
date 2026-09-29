'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
	children: ReactNode;
	fallback?: ReactNode;
};

type State = {
	error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		if (process.env.NODE_ENV === 'development') {
			console.error('[ErrorBoundary]', error, info.componentStack);
		}
	}

	render() {
		if (this.state.error) {
			if (this.props.fallback) return this.props.fallback;

			return (
				<div className="rounded-xl border border-danger/35 bg-danger/[0.08] p-5" role="alert">
					<div className="text-base font-semibold">Something went wrong</div>
					<div className="mt-1 break-words text-sm leading-6 text-muted">
						{this.state.error.message || 'An unexpected error occurred.'} Try again, or reload the page if it keeps happening.
					</div>
					<button className="dash-btn mt-4" onClick={() => this.setState({ error: null })} type="button">
						Try Again
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}
