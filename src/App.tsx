import { AuthProvider } from '@/context/AuthContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Chat from '@/components/Chat';

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<AuthForm />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Chat />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
