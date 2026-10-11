import { AuthProvider } from '@/context/AuthContext';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Settings from '@/components/Settings';
import { Toast } from '@base-ui/react/toast';
import NewRoom from '@/components/NewRoom.tsx';
import ChatLayout from '@/components/ChatLayout';
import DirectChat from '@/components/DirectChat';
import RoomChat from '@/components/RoomChat';

export default function App() {
    return (
        <AuthProvider>
            <Toast.Provider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<AuthForm />} />

                        <Route
                            path="/"
                            element={<Navigate to="/chat" replace />}
                        />

                        <Route
                            path="/chat"
                            element={
                                <ProtectedRoute>
                                    <ChatLayout>
                                        <DirectChat />
                                    </ChatLayout>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/chat/room/new"
                            element={
                                <ProtectedRoute>
                                    <NewRoom />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/chat/direct/:chatId"
                            element={
                                <ProtectedRoute>
                                    <ChatLayout>
                                        <DirectChat />
                                    </ChatLayout>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/chat/room/:chatId"
                            element={
                                <ProtectedRoute>
                                    <ChatLayout>
                                        <RoomChat />
                                    </ChatLayout>
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
