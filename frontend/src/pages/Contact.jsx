import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, MapPin, Clock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const Contact = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    const [form, setForm] = useState({
        name: user?.profile ? `${user.profile.firstName} ${user.profile.lastName}`.trim() : '',
        email: user?.email || '',
        message: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
            toast.error('Please fill in all fields.');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/contact', form);
            toast.success('Message sent! We will get back to you soon.');
            if (isAuthenticated && user?.role === 'CUSTOMER') {
                navigate('/my-messages');
            } else {
                setForm(prev => ({ ...prev, message: '' }));
            }
        } catch (error) {
            toast.error(error.message || 'Failed to send message. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-foreground tracking-tight">{t('contactPage.title')}</h1>
                    <p className="mt-3 text-lg text-muted-foreground">{t('contactPage.subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                    {/* Contact Info */}
                    <div className="space-y-8">
                        <a href="https://maps.google.com/?q=Bole+Road,+Addis+Ababa,+Ethiopia" target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 group hover:opacity-90 transition-opacity">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                <MapPin className="text-primary" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{t('contact.address')}</h3>
                                <p className="text-muted-foreground group-hover:text-foreground transition-colors">{t('contact.addressText')}</p>
                            </div>
                        </a>
                        <a href="tel:+251900000000" className="flex items-start gap-4 group hover:opacity-90 transition-opacity">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                <Phone className="text-primary" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{t('contact.phone')}</h3>
                                <p className="text-muted-foreground group-hover:text-foreground transition-colors">+251 911452860</p>
                            </div>
                        </a>
                        <a href="mailto:info@teddyrental.com" className="flex items-start gap-4 group hover:opacity-90 transition-opacity">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                <Mail className="text-primary" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{t('contact.email')}</h3>
                                <p className="text-muted-foreground group-hover:text-foreground transition-colors">teddycarrental@gmail.com</p>
                            </div>
                        </a>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Clock className="text-primary" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">{t('contact.businessHours')}</h3>
                                <p className="text-muted-foreground">{t('contactPage.monSat')}: 8:00 AM – 6:00 PM</p>
                                <p className="text-muted-foreground">{t('contactPage.sunday')}: {t('contactPage.closed')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
                        <h2 className="text-xl font-bold text-foreground mb-6">{t('contactPage.formTitle')}</h2>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">{t('contactPage.name')}</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-muted/20 text-foreground"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">{t('contactPage.email')}</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-muted/20 text-foreground"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">{t('contactPage.message')}</label>
                                <textarea
                                    name="message"
                                    value={form.message}
                                    onChange={handleChange}
                                    rows={4}
                                    required
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none bg-muted/20 text-foreground"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-primary text-white py-2.5 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {submitting && <Loader2 size={16} className="animate-spin" />}
                                {submitting ? 'Sending...' : t('contactPage.send')}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
