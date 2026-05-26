import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';

const Logout = () => {
    const { logout } = useAuth();

    useEffect(() => {
        logout();
    }, [logout]);


    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4 bg-gray-50">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-6">
                    <LogOut className="h-8 w-8 text-gray-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Logged Out</h2>
                <p className="text-gray-500 mb-8">
                    You have been securely logged out of your account. We hope to see you again soon!
                </p>

                <div className="space-y-4">
                    <Link to="/login" className="block">
                        <Button>Sign In Again</Button>
                    </Link>
                    <Link to="/" className="block">
                        <Button variant="outline">Return to Home</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Logout;
