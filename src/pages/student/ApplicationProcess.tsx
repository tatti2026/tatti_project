import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStudentByProfileId, createStudent, getStudentRecommendations,
  getAllCourses, upsertApplication, getStudentApplication,
  createPayment, getStudentPayment, updateStudent
} from '@/lib/api';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Student, Course, Application, Payment } from '@/types/index';
import {
  CheckCircle2, User, BookOpen, CreditCard, Loader2,
  Shield, ChevronRight, Download
} from 'lucide-react';
import { format } from 'date-fns';

type Step = 1 | 2 | 3 | 4;

const PAYMENT_METHODS = ['UPI', 'Credit/Debit Card', 'Net Banking', 'Bank Transfer'] as const;

export default function ApplicationProcess() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  const [form, setForm] = useState({
    full_name: '', student_id_text: '', email: '', phone: '',
    date_of_birth: '', address: '', city: '', state: '', pincode: ''
  });

  useEffect(() => {
    if (!profile) return;
    (async () => {
      let s = await getStudentByProfileId(profile.id);
      if (!s) s = await createStudent({ profile_id: profile.id, email: profile.email, full_name: profile.full_name });
      setStudent(s);
      if (s) {
        setForm({
          full_name: s.full_name || profile.full_name || '',
          student_id_text: s.student_id || '',
          email: s.email || profile.email || '',
          phone: s.phone || '',
          date_of_birth: s.date_of_birth || '',
          address: s.address || '',
          city: s.city || '',
          state: s.state || '',
          pincode: s.pincode || '',
        });
        const [recs, allCourses, existingApp, existingPay] = await Promise.all([
          getStudentRecommendations(s.id),
          getAllCourses(),
          getStudentApplication(s.id),
          getStudentPayment(s.id),
        ]);
        setCourses(allCourses.filter(c => c.status === 'available'));
        const selRec = recs.find(r => r.is_selected);
        if (selRec) {
          const course = allCourses.find(c => c.id === selRec.course_id);
          setSelectedCourse(course || null);
        }
        if (existingApp) {
          setApplication(existingApp);
          if (existingApp.course_id) {
            const c = allCourses.find(c => c.id === existingApp.course_id);
            if (c) setSelectedCourse(c);
          }
        }
        if (existingPay?.status === 'paid') {
          setPayment(existingPay);
          setStep(4);
        } else if (existingApp?.step) {
          setStep((Math.min(existingApp.step, 3)) as Step);
        }
      }
      setLoading(false);
    })();
  }, [profile]);

  const handleStep1 = async () => {
    if (!form.full_name || !form.email || !form.phone) { toast.error('Please fill in required fields'); return; }
    setSaving(true);
    if (student) {
      await updateStudent(student.id, {
        full_name: form.full_name, email: form.email, phone: form.phone,
        date_of_birth: form.date_of_birth || null, address: form.address,
        city: form.city, state: form.state, pincode: form.pincode,
        student_id: form.student_id_text || null,
        application_status: 'in_progress',
      });
    }
    setSaving(false);
    setStep(2);
  };

  const handleStep2 = async () => {
    if (!selectedCourse) { toast.error('No course selected. Please go to Course Recommendation first.'); return; }
    setSaving(true);
    if (student) {
      let app = application;
      if (!app) {
        app = await upsertApplication({ student_id: student.id, course_id: selectedCourse.id, status: 'in_progress', step: 2 });
      } else {
        app = await upsertApplication({ ...app, course_id: selectedCourse.id, step: 2 });
      }
      setApplication(app);
    }
    setSaving(false);
    setStep(3);
  };

  const handlePayment = async () => {
    if (!student || !application || !selectedCourse) { toast.error('Application not complete'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 2000)); // Simulate payment
    const pay = await createPayment({
      application_id: application.id,
      student_id: student.id,
      amount: selectedCourse.fee,
      payment_method: paymentMethod,
      status: 'paid',
      paid_at: new Date().toISOString(),
    });
    await upsertApplication({ ...application, status: 'submitted', step: 4, submitted_at: new Date().toISOString() });
    await updateStudent(student.id, { payment_status: 'paid', application_status: 'submitted' });
    setPayment(pay);
    setSaving(false);
    setStep(4);
    toast.success('Payment successful!');
  };

  const downloadReceipt = () => {
    const content = [
      'TATTI - Payment Receipt',
      '=======================',
      `Student Name: ${form.full_name}`,
      `Application ID: ${application?.application_number || 'N/A'}`,
      `Payment ID: ${payment?.payment_id || 'N/A'}`,
      `Transaction ID: ${payment?.transaction_id || 'N/A'}`,
      `Course: ${selectedCourse?.course_name || 'N/A'}`,
      `Amount Paid: ₹${selectedCourse?.fee.toLocaleString() || 'N/A'}`,
      `Payment Date: ${payment?.paid_at ? format(new Date(payment.paid_at), 'dd MMM yyyy') : 'N/A'}`,
      `Payment Method: ${payment?.payment_method || 'N/A'}`,
      `Status: PAID`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `TATTI_Receipt_${application?.application_number || 'receipt'}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const steps = [
    { n: 1, label: 'Personal Details', icon: User },
    { n: 2, label: 'Course Selection', icon: BookOpen },
    { n: 3, label: 'Payment', icon: CreditCard },
    { n: 4, label: 'Confirmation', icon: CheckCircle2 },
  ];

  if (loading) return (
    <StudentLayout>
      <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
    </StudentLayout>
  );

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Stepper */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            {steps.map(({ n, label, icon: Icon }, idx) => (
              <div key={n} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    step > n ? 'bg-primary border-primary' : step === n ? 'border-primary bg-primary/10' : 'border-border bg-muted'
                  }`}>
                    {step > n ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Icon className={`w-4 h-4 ${step === n ? 'text-primary' : 'text-muted-foreground'}`} />}
                  </div>
                  <span className={`text-[10px] font-medium whitespace-nowrap hidden md:block ${step >= n ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                </div>
                {idx < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 ${step > n ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'full_name', label: 'Full Name *', placeholder: 'Enter your full name' },
                { id: 'student_id_text', label: 'Student ID', placeholder: 'Enter student ID' },
                { id: 'email', label: 'Email *', placeholder: 'Enter your email' },
                { id: 'phone', label: 'Phone Number *', placeholder: 'Enter phone number' },
                { id: 'date_of_birth', label: 'Date of Birth', placeholder: '', type: 'date' },
                { id: 'pincode', label: 'Pincode', placeholder: 'Enter pincode' },
              ].map(({ id, label, placeholder, type }) => (
                <div key={id}>
                  <Label className="text-sm">{label}</Label>
                  <Input type={type || 'text'} placeholder={placeholder}
                    value={(form as Record<string, string>)[id]} onChange={e => setForm(p => ({ ...p, [id]: e.target.value }))}
                    className="mt-1 bg-input border-border" />
                </div>
              ))}
              <div className="md:col-span-2">
                <Label className="text-sm">Address</Label>
                <Input placeholder="Street address" value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="mt-1 bg-input border-border" />
              </div>
              <div>
                <Label className="text-sm">City</Label>
                <Input placeholder="City" value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="mt-1 bg-input border-border" />
              </div>
              <div>
                <Label className="text-sm">State</Label>
                <Input placeholder="State" value={form.state}
                  onChange={e => setForm(p => ({ ...p, state: e.target.value }))} className="mt-1 bg-input border-border" />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={handleStep1} disabled={saving} className="gradient-bg border-0 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Course Selection */}
        {step === 2 && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Selected Course</h2>
            {selectedCourse ? (
              <div className="bg-muted rounded-xl p-5 mb-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-base font-bold text-foreground">{selectedCourse.course_name}</h3>
                  <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full shrink-0">Selected</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{selectedCourse.description}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Duration', value: selectedCourse.duration },
                    { label: 'Category', value: selectedCourse.category },
                    { label: 'Eligibility', value: selectedCourse.eligibility },
                    { label: 'Available Seats', value: selectedCourse.available_seats?.toString() },
                  ].filter(i => i.value).map(({ label, value }) => (
                    <div key={label} className="bg-background rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border mt-4 pt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Course Fee</span>
                  <span className="text-xl font-bold gradient-text">₹{selectedCourse.fee.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No course selected. Please go to Course Recommendations first.</p>
                <Button onClick={() => navigate('/student/courses')} variant="outline" className="mt-3" size="sm">Go to Recommendations</Button>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleStep2} disabled={saving || !selectedCourse} className="flex-1 gradient-bg border-0 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Continue to Payment <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && selectedCourse && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-2">Complete Your Payment</h2>
            <div className="text-center p-4 bg-muted rounded-xl mb-5">
              <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
              <p className="text-3xl font-bold gradient-text">₹{selectedCourse.fee.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">For: {selectedCourse.course_name}</p>
            </div>
            <div className="space-y-2 mb-5">
              <p className="text-sm font-medium text-foreground mb-2">Select Payment Method</p>
              {PAYMENT_METHODS.map(method => (
                <button key={method} onClick={() => setPaymentMethod(method)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    paymentMethod === method ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                  }`}>
                  <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === method ? 'border-primary bg-primary' : 'border-border'}`}>
                    {paymentMethod === method && <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5" />}
                  </div>
                  <span className="text-sm text-foreground">{method}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg border border-success/20 mb-5">
              <Shield className="w-4 h-4 text-success shrink-0" />
              <p className="text-xs text-success">🔒 Your payment information is securely processed.</p>
            </div>
            <p className="text-xs text-muted-foreground mb-4 text-center">Your application will be submitted after successful payment.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handlePayment} disabled={saving} className="flex-1 gradient-bg border-0 text-white font-semibold">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</> : 'Proceed to Pay'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && payment && (
          <div className="glass-card rounded-xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">Payment Successful!</h2>
            <p className="text-muted-foreground text-sm mb-6">Your application has been submitted successfully.</p>

            <div className="bg-muted rounded-xl p-4 text-left space-y-3 mb-6">
              {[
                { label: 'Student Name', value: form.full_name },
                { label: 'Application ID', value: application?.application_number || 'N/A' },
                { label: 'Payment ID', value: payment.payment_id || 'N/A' },
                { label: 'Transaction ID', value: payment.transaction_id || 'N/A' },
                { label: 'Selected Course', value: selectedCourse?.course_name || 'N/A' },
                { label: 'Amount Paid', value: `₹${selectedCourse?.fee.toLocaleString() || 'N/A'}` },
                { label: 'Payment Date', value: payment.paid_at ? format(new Date(payment.paid_at), 'dd MMM yyyy, hh:mm a') : 'N/A' },
                { label: 'Payment Method', value: payment.payment_method || 'N/A' },
                { label: 'Status', value: 'PAID' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                  <span className={`text-xs font-semibold text-right ${label === 'Status' ? 'text-success' : 'text-foreground'}`}>{value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={downloadReceipt} className="flex-1">
                <Download className="w-4 h-4 mr-2" /> Download Receipt
              </Button>
              <Button onClick={() => navigate('/student/dashboard')} className="flex-1 gradient-bg border-0 text-white">
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
