import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4 bg-gray-50">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                <div className="text-8xl font-extrabold text-gray-200 mb-4">404</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
                <p className="text-gray-500 mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <div className="space-y-4">
                    <Link to="/" className="block">
                        <Button className="gap-2">
                            <Home size={16} />
                            Go Home
                        </Button>
                    </Link>
                    <Button variant="outline" className="gap-2" onClick={() => window.history.back()}>
                        <ArrowLeft size={16} />
                        Go Back
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
