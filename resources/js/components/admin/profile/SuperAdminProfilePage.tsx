import { Transition } from '@headlessui/react';
import { Form, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    CheckCircle2,
    KeyRound,
    Mail,
    MonitorCog,
    Save,
    ShieldCheck,
    TriangleAlert,
    UserRound,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { edit as editAppearance } from '@/routes/appearance';
import { show as showTwoFactor } from '@/routes/two-factor';
import { edit as editPassword } from '@/routes/user-password';
import { send as sendVerification } from '@/routes/verification';
import type { User } from '@/types/auth';

type SuperAdminProfilePageProps = {
    user: User;
    mustVerifyEmail: boolean;
    status?: string;
};

const inputClassName =
    'h-[42px] w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-4 text-sm text-[#101828] outline-none transition placeholder:text-[#99a1af] focus:border-[#1e3a8a] focus:bg-white focus:ring-2 focus:ring-[#1e3a8a]/10 aria-invalid:border-[#ff6467] aria-invalid:ring-[#ff6467]/10';

const settingsLinks = [
    {
        label: 'Password',
        description: 'Update your account password',
        href: editPassword(),
        icon: KeyRound,
    },
    {
        label: 'Two-factor authentication',
        description: 'Add an extra layer of security',
        href: showTwoFactor(),
        icon: ShieldCheck,
    },
    {
        label: 'Appearance',
        description: 'Choose your display preference',
        href: editAppearance(),
        icon: MonitorCog,
    },
];

export function SuperAdminProfilePage({
    user,
    mustVerifyEmail,
    status,
}: SuperAdminProfilePageProps) {
    const [search, setSearch] = useState('');
    const initials = useMemo(
        () =>
            user.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join('') || 'SA',
        [user.name],
    );

    return (
        <AdminLayout
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search administration..."
        >
            <main className="px-4 py-8 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="mb-1 text-xs font-semibold tracking-[0.12em] text-[#1e3a8a] uppercase">
                                Account settings
                            </p>
                            <h1 className="text-2xl leading-9 font-bold text-[#0f172a]">
                                My Profile
                            </h1>
                            <p className="mt-1 text-sm leading-5 text-[#4a5565]">
                                Manage your personal information and account
                                security.
                            </p>
                        </div>
                        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1.5 text-xs font-semibold text-[#9a3412]">
                            <ShieldCheck
                                className="size-3.5"
                                aria-hidden="true"
                            />
                            Super Administrator
                        </span>
                    </header>

                    <section className="mt-6 overflow-hidden rounded-[14px] bg-[#0f172a] shadow-[0_4px_14px_rgba(15,23,42,0.14)]">
                        <div className="relative flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:px-7">
                            <div
                                className="pointer-events-none absolute top-0 right-0 h-full w-2/5 bg-[radial-gradient(circle_at_top_right,rgba(254,154,0,0.18),transparent_68%)]"
                                aria-hidden="true"
                            />
                            <div className="relative flex size-16 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-[#fe9a00]/15 text-xl font-bold text-[#ffb900] sm:size-20">
                                {initials}
                            </div>
                            <div className="relative min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h2 className="truncate text-xl font-bold text-white">
                                        {user.name}
                                    </h2>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                                        <span className="size-1.5 rounded-full bg-emerald-400" />
                                        Active
                                    </span>
                                </div>
                                <p className="mt-1.5 flex items-center gap-2 text-sm text-white/60">
                                    <Mail
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span className="truncate">
                                        {user.email}
                                    </span>
                                </p>
                                <p className="mt-3 max-w-2xl text-xs leading-5 text-white/40">
                                    Full system access · Keep this account
                                    secured with a strong password and
                                    two-factor authentication.
                                </p>
                            </div>
                            <div className="relative flex shrink-0 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-medium text-white/70">
                                <BadgeCheck className="size-4 text-emerald-400" />
                                {user.email_verified_at
                                    ? 'Email verified'
                                    : 'Verification pending'}
                            </div>
                        </div>
                    </section>

                    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                        <ProfileInformationCard
                            user={user}
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                        />

                        <aside className="space-y-6">
                            <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                                <div className="flex items-center gap-3 border-b border-[#f3f4f6] pb-4">
                                    <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#eef2ff] text-[#4338ca]">
                                        <ShieldCheck className="size-4" />
                                    </span>
                                    <div>
                                        <h2 className="text-sm font-bold text-[#101828]">
                                            Account security
                                        </h2>
                                        <p className="mt-0.5 text-xs text-[#6a7282]">
                                            Protect your administrator account
                                        </p>
                                    </div>
                                </div>

                                <nav
                                    className="mt-2"
                                    aria-label="Account security settings"
                                >
                                    {settingsLinks.map((item) => (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            className="group flex items-center gap-3 rounded-[10px] px-2 py-3 transition hover:bg-[#f9fafb]"
                                        >
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f3f4f6] text-[#4a5565] transition group-hover:bg-[#eef2ff] group-hover:text-[#1e3a8a]">
                                                <item.icon className="size-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-semibold text-[#364153]">
                                                    {item.label}
                                                </span>
                                                <span className="mt-0.5 block truncate text-xs text-[#99a1af]">
                                                    {item.description}
                                                </span>
                                            </span>
                                            <ArrowRight className="size-4 text-[#d1d5dc] transition group-hover:translate-x-0.5 group-hover:text-[#1e3a8a]" />
                                        </Link>
                                    ))}
                                </nav>
                            </section>

                            <DeleteAccountCard />
                        </aside>
                    </div>
                </div>
            </main>
        </AdminLayout>
    );
}

function ProfileInformationCard({
    user,
    mustVerifyEmail,
    status,
}: SuperAdminProfilePageProps) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:p-6">
            <div className="flex items-center gap-3 border-b border-[#f3f4f6] pb-4">
                <span className="flex size-10 items-center justify-center rounded-[10px] bg-[#eef2ff] text-[#4338ca]">
                    <UserRound className="size-5" />
                </span>
                <div>
                    <h2 className="text-sm font-bold text-[#101828]">
                        Personal information
                    </h2>
                    <p className="mt-0.5 text-xs text-[#6a7282]">
                        Update the details associated with your RIKMS account.
                    </p>
                </div>
            </div>

            <Form
                {...ProfileController.update.form()}
                options={{ preserveScroll: true }}
                className="mt-6"
            >
                {({ processing, recentlySuccessful, errors }) => (
                    <>
                        <div className="grid gap-5 md:grid-cols-2">
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-[#364153]">
                                    Full name{' '}
                                    <span className="text-[#ff6467]">*</span>
                                </span>
                                <input
                                    id="name"
                                    name="name"
                                    defaultValue={user.name}
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                    aria-invalid={Boolean(errors.name)}
                                    className={inputClassName}
                                />
                                <InputError
                                    className="mt-1.5"
                                    message={errors.name}
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-[#364153]">
                                    Email address{' '}
                                    <span className="text-[#ff6467]">*</span>
                                </span>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#99a1af]" />
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        defaultValue={user.email}
                                        required
                                        autoComplete="username"
                                        placeholder="Email address"
                                        aria-invalid={Boolean(errors.email)}
                                        className={`${inputClassName} pl-10`}
                                    />
                                </div>
                                <InputError
                                    className="mt-1.5"
                                    message={errors.email}
                                />
                            </label>
                        </div>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-[#364153]">
                                    Account role
                                </span>
                                <input
                                    value="Super Administrator"
                                    readOnly
                                    disabled
                                    className={`${inputClassName} cursor-not-allowed bg-[#f3f4f6] text-[#6a7282]`}
                                />
                                <span className="mt-1.5 block text-xs text-[#99a1af]">
                                    Role changes are managed through RBAC.
                                </span>
                            </label>

                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-[#364153]">
                                    Account status
                                </span>
                                <span className="flex h-[42px] items-center gap-2 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 text-sm font-medium text-[#166534]">
                                    <CheckCircle2 className="size-4" /> Active
                                </span>
                            </label>
                        </div>

                        {mustVerifyEmail && user.email_verified_at === null ? (
                            <div className="mt-5 rounded-[10px] border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-sm text-[#9a3412]">
                                Your email address is not verified.{' '}
                                <Link
                                    href={sendVerification()}
                                    as="button"
                                    className="font-semibold underline underline-offset-2"
                                >
                                    Resend verification email
                                </Link>
                                {status === 'verification-link-sent' ? (
                                    <p className="mt-1 font-medium text-[#166534]">
                                        A new verification link has been sent.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[#f3f4f6] pt-5">
                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p
                                    className="flex items-center gap-1.5 text-sm font-medium text-[#008236]"
                                    role="status"
                                >
                                    <CheckCircle2 className="size-4" /> Changes
                                    saved
                                </p>
                            </Transition>
                            <button
                                type="submit"
                                disabled={processing}
                                data-test="update-profile-button"
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172f70] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Save className="size-4" />
                                {processing ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </>
                )}
            </Form>
        </section>
    );
}

function DeleteAccountCard() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <section className="rounded-[14px] border border-[#fecaca] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#fef2f2] text-[#e7000b]">
                    <TriangleAlert className="size-4" />
                </span>
                <div>
                    <h2 className="text-sm font-bold text-[#991b1b]">
                        Danger zone
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-[#b91c1c]">
                        Deleting this account immediately revokes your access to
                        RIKMS administration.
                    </p>
                </div>
            </div>

            <Dialog>
                <DialogTrigger asChild>
                    <button
                        type="button"
                        data-test="delete-user-button"
                        className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-[10px] border border-[#fecaca] bg-white px-3 text-sm font-semibold text-[#c10007] transition hover:bg-[#fef2f2]"
                    >
                        Delete my account
                    </button>
                </DialogTrigger>
                <DialogContent>
                    <DialogTitle>Confirm account deletion</DialogTitle>
                    <DialogDescription>
                        This disables your account access. Historical records
                        may be retained for audit and records-management
                        purposes. Enter your password to confirm.
                    </DialogDescription>
                    <Form
                        {...ProfileController.destroy.form()}
                        options={{ preserveScroll: true }}
                        onError={() => passwordInput.current?.focus()}
                        resetOnSuccess
                        className="space-y-6"
                    >
                        {({ resetAndClearErrors, processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="delete-account-password"
                                        className="sr-only"
                                    >
                                        Password
                                    </Label>
                                    <PasswordInput
                                        id="delete-account-password"
                                        name="password"
                                        ref={passwordInput}
                                        placeholder="Current password"
                                        autoComplete="current-password"
                                    />
                                    <InputError message={errors.password} />
                                </div>
                                <DialogFooter className="gap-2">
                                    <DialogClose asChild>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() =>
                                                resetAndClearErrors()
                                            }
                                        >
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        variant="destructive"
                                        disabled={processing}
                                        asChild
                                    >
                                        <button
                                            type="submit"
                                            data-test="confirm-delete-user-button"
                                        >
                                            {processing
                                                ? 'Deleting...'
                                                : 'Delete Account'}
                                        </button>
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </section>
    );
}
