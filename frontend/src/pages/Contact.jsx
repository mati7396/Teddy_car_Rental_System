import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

const Contact = () => {
    const { t } = useTranslation();

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
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <MapPin className="text-primary" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">{t('contact.address')}</h3>
                                <p className="text-muted-foreground">{t('contact.addressText')}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Phone className="text-primary" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">{t('contact.phone')}</h3>
                                <p className="text-muted-foreground">+251 900 000 000</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Mail className="text-primary" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">{t('contact.email')}</h3>
                                <p className="text-muted-foreground">info@teddyrental.com</p>
                            </div>
                        </div>
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
                        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert(t('contact.subtitle')); }}>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">{t('contactPage.name')}</label>
                                <input type="text" required className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-muted/20 text-foreground" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">{t('contactPage.email')}</label>
                                <input type="email" required className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-muted/20 text-foreground" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">{t('contactPage.message')}</label>
                                <textarea rows={4} required className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none bg-muted/20 text-foreground" />
                            </div>
                            <button type="submit" className="w-full bg-primary text-white py-2.5 rounded-lg font-bold hover:opacity-90 transition-opacity">
                                {t('contactPage.send')}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
