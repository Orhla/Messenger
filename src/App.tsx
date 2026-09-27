import { AuthProvider } from '@/context/AuthContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Chat from '@/components/Chat';
import Settings from '@/components/Settings';
import { Toast } from '@base-ui/react/toast';

export default function App() {
    return (
        <AuthProvider>
            <Toast.Provider>
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
                        <Route
                            path="/settings"
                            element={
                                <ProtectedRoute>
                                    <Settings />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </BrowserRouter>
            </Toast.Provider>
        </AuthProvider>
    );
}
