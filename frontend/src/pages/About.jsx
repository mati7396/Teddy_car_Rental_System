import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Award, MapPin, Shield } from 'lucide-react';

const About = () => {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <div className="bg-gray-900 text-white py-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-4">{t('aboutPage.title')}</h1>
                    <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                        {t('aboutPage.desc')}
                    </p>
                </div>
            </div>

            {/* Values */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="bg-card rounded-xl p-6 shadow-sm border border-border text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                            <Users className="text-primary" size={24} />
                        </div>
                        <h3 className="font-bold text-foreground mb-2">{t('whyChoose.customerFirst')}</h3>
                        <p className="text-sm text-muted-foreground">{t('whyChoose.customerFirstDesc')}</p>
                    </div>
                    <div className="bg-card rounded-xl p-6 shadow-sm border border-border text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                            <Award className="text-primary" size={24} />
                        </div>
                        <h3 className="font-bold text-foreground mb-2">{t('whyChoose.qualityFleet')}</h3>
                        <p className="text-sm text-muted-foreground">{t('whyChoose.qualityFleetDesc')}</p>
                    </div>
                    <div className="bg-card rounded-xl p-6 shadow-sm border border-border text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                            <MapPin className="text-primary" size={24} />
                        </div>
                        <h3 className="font-bold text-foreground mb-2">{t('whyChoose.localExpertise')}</h3>
                        <p className="text-sm text-muted-foreground">{t('whyChoose.localExpertiseDesc')}</p>
                    </div>
                    <div className="bg-card rounded-xl p-6 shadow-sm border border-border text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                            <Shield className="text-primary" size={24} />
                        </div>
                        <h3 className="font-bold text-foreground mb-2">{t('whyChoose.fullyInsured')}</h3>
                        <p className="text-sm text-muted-foreground">{t('whyChoose.fullyInsuredDesc')}</p>
                    </div>
                </div>

                {/* Mission */}
                <div className="mt-16 bg-card rounded-2xl p-8 shadow-sm border border-border">
                    <h2 className="text-2xl font-bold text-foreground mb-4">{t('aboutPage.missionTitle')}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        {t('aboutPage.missionDesc')}
                    </p>
                </div>

                {/* Contact Info */}
                <div className="mt-16 text-center max-w-md mx-auto">
                    <h2 className="text-2xl font-bold text-foreground mb-4">{t('aboutPage.visitUs')}</h2>
                    <div className="space-y-2">
                        <a href="https://maps.google.com/?q=Bole+Road,+Addis+Ababa,+Ethiopia" target="_blank" rel="noopener noreferrer" className="block text-muted-foreground hover:text-primary transition-colors">
                            {t('contact.addressText')}
                        </a>
                        <a href="tel:+251900000000" className="block text-muted-foreground hover:text-primary transition-colors">
                            {t('contact.phone')}: +251 911452860
                        </a>
                        <a href="mailto:info@teddyrental.com" className="block text-muted-foreground hover:text-primary transition-colors">
                            {t('contact.email')}: teddycarrental@gmail.com
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
