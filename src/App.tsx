import { AuthProvider } from '@/context/AuthContext';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Settings from '@/components/Settings';
import { Toast } from '@base-ui/react/toast';
import NewRoom from '@/components/NewRoom.tsx';
import ChatLayout from '@/components/ChatLayout';
import DirectChat from '@/components/DirectChat';
import ValidChat from '@/components/ValidChat.tsx';
import EmptyState from '@/components/EmptyState';
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
                            element={
                                <ProtectedRoute>
                                    <ChatLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route
                                path="/chat"
                                element={
                                    <div className="flex flex-1 h-full w-full min-h-0 bg-background">
                                        <EmptyState />
                                    </div>
                                }
                            />
                            <Route
                                path="/chat/direct/:chatId"
                                element={
                                    <ValidChat>
                                        {(validId) => (
                                            <DirectChat chatId={validId} />
                                        )}
                                    </ValidChat>
                                }
                            />
                            <Route
                                path="/chat/room/:chatId"
                                element={
                                    <ValidChat>
                                        {(validId) => (
                                            <RoomChat chatId={validId} />
                                        )}
                                    </ValidChat>
                                }
                            />
                        </Route>

                        <Route
                            path="/chat/room/new"
                            element={
                                <ProtectedRoute>
                                    <NewRoom />
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
