import { Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';

export default function Register() {
    return (
        <AuthLayout
            title="Registration unavailable"
            description="RIKMS accounts are created by authorized administrators."
        >
            <Head title="Register" />
            <div className="text-center text-sm text-muted-foreground">
                Already have an account? <TextLink href={login()}>Log in</TextLink>
            </div>
        </AuthLayout>
    );
}
