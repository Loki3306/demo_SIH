import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Upload, FileText, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const schema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Valid 10-digit phone required").max(15, "Phone number too long"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  itinerary: z.string().min(10, "Please provide a detailed travel plan"),
  emergencyName: z.string().min(2, "Emergency contact name is required"),
  emergencyPhone: z.string().min(10, "Valid emergency contact phone required"),
  docType: z.enum(["aadhaar", "passport"], { required_error: "Please select document type" }),
  docNumber: z.string().min(6, "Document number is required"),
  consent: z.boolean().refine((v) => v === true, { message: "You must agree to terms and conditions" }),
  documentFile: z.any().refine((file) => file && file.length > 0, "Document upload is required")
});

type FormData = z.infer<typeof schema>;

export default function AuthRegister() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const navigate = useNavigate();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { docType: "aadhaar" },
    mode: "onBlur",
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setSubmitError('Please upload a valid image (JPG, PNG) or PDF file');
        return;
      }
      
      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setSubmitError('File size must be less than 5MB');
        return;
      }
      
      setUploadedFile(file);
      setValue("documentFile", [file], { shouldValidate: true });
      setSubmitError(null);
    }
  };

  const nextStep = () => {
    setStep((s) => Math.min(4, s + 1));
    setSubmitError(null);
  };

  const prevStep = () => {
    setStep((s) => Math.max(1, s - 1));
    setSubmitError(null);
  };

  async function onSubmit(values: FormData) {
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('name', values.fullName);
      formData.append('email', values.email);
      formData.append('phone', values.phone);
      formData.append('password', values.password);
      formData.append('itinerary', values.itinerary);
      formData.append('emergencyName', values.emergencyName);
      formData.append('emergencyPhone', values.emergencyPhone);
      formData.append('documentType', values.docType);
      formData.append('documentNumber', values.docNumber);
      
      if (uploadedFile) {
        formData.append('documentFile', uploadedFile);
        formData.append('documentFileName', uploadedFile.name);
      }
      
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: values.fullName,
          email: values.email,
          phone: values.phone,
          password: values.password,
          itinerary: values.itinerary,
          emergencyName: values.emergencyName,
          emergencyPhone: values.emergencyPhone,
          documentType: values.docType,
          documentNumber: values.docNumber,
          documentFileName: uploadedFile?.name || 'unknown'
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || data.error || "Registration failed");
      }
      
      setRegistrationData(data);
      setSubmitted(true);
      
    } catch (e: any) {
      console.error('Registration error:', e);
      setSubmitError(e.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="container mx-auto py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-green-800 dark:text-green-200">
                Application Submitted Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-green-700 dark:text-green-300">
                Your Digital Tourist ID application has been submitted for verification.
              </p>
              
              {registrationData && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Application ID:</strong> {registrationData.userId}<br/>
                    <strong>Status:</strong> {registrationData.status}<br/>
                    <strong>Submitted:</strong> {new Date(registrationData.applicationDate).toLocaleDateString()}
                  </AlertDescription>
                </Alert>
              )}
              
              <p className="text-sm text-muted-foreground">
                You will receive an email notification once your verification is complete.
                This process typically takes 2-3 business days.
              </p>
              
              <div className="space-y-2 pt-4">
                <Button 
                  onClick={() => navigate('/auth/login')} 
                  className="w-full"
                >
                  Continue to Login
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')} 
                  className="w-full"
                >
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-8 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Apply for Digital Tourist ID</CardTitle>
              <div className="text-sm text-muted-foreground font-medium">
                Step {step} of 4
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-secondary rounded-full h-2 mt-4">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              {step === 1 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Personal Information</h3>
                    <p className="text-sm text-muted-foreground">Let's start with your basic details</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input 
                      id="fullName" 
                      placeholder="Enter your full name as per documents"
                      {...register("fullName")} 
                    />
                    {errors.fullName && <p className="text-sm text-red-500 mt-1">{errors.fullName.message}</p>}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="your.email@example.com"
                        {...register("email")} 
                      />
                      {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="+91 XXXXX XXXXX"
                        {...register("phone")} 
                      />
                      {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="password">Create Password *</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Minimum 6 characters"
                      {...register("password")} 
                    />
                    {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Travel Details</h3>
                    <p className="text-sm text-muted-foreground">Tell us about your travel plans and emergency contact</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="itinerary">Planned Itinerary *</Label>
                    <Textarea 
                      id="itinerary" 
                      rows={4} 
                      placeholder="Describe your travel plans, destinations, and duration in detail..."
                      {...register("itinerary")} 
                    />
                    {errors.itinerary && <p className="text-sm text-red-500 mt-1">{errors.itinerary.message}</p>}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergencyName">Emergency Contact Name *</Label>
                      <Input 
                        id="emergencyName" 
                        placeholder="Full name of emergency contact"
                        {...register("emergencyName")} 
                      />
                      {errors.emergencyName && <p className="text-sm text-red-500 mt-1">{errors.emergencyName.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="emergencyPhone">Emergency Contact Phone *</Label>
                      <Input 
                        id="emergencyPhone" 
                        type="tel" 
                        placeholder="+91 XXXXX XXXXX"
                        {...register("emergencyPhone")} 
                      />
                      {errors.emergencyPhone && <p className="text-sm text-red-500 mt-1">{errors.emergencyPhone.message}</p>}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Document Verification</h3>
                    <p className="text-sm text-muted-foreground">Upload your identity document for verification</p>
                  </div>
                  
                  <div>
                    <Label className="text-base font-medium">Document Type *</Label>
                    <RadioGroup 
                      value={watch("docType")} 
                      onValueChange={(v) => setValue("docType", v as any, { shouldValidate: true })} 
                      className="flex gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="aadhaar" id="aadhaar" />
                        <Label htmlFor="aadhaar" className="font-normal cursor-pointer">
                          <div>
                            <div className="font-medium">Aadhaar Card</div>
                            <div className="text-sm text-muted-foreground">12-digit unique identification</div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="passport" id="passport" />
                        <Label htmlFor="passport" className="font-normal cursor-pointer">
                          <div>
                            <div className="font-medium">Passport</div>
                            <div className="text-sm text-muted-foreground">International travel document</div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                    {errors.docType && <p className="text-sm text-red-500 mt-1">{errors.docType.message}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="docNumber">{watch("docType") === "passport" ? "Passport" : "Aadhaar"} Number *</Label>
                    <Input 
                      id="docNumber" 
                      placeholder={watch("docType") === "passport" ? "e.g., A1234567" : "e.g., 1234 5678 9012"}
                      {...register("docNumber")} 
                    />
                    {errors.docNumber && <p className="text-sm text-red-500 mt-1">{errors.docNumber.message}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="docFile">Upload Document *</Label>
                    <div className="mt-2">
                      <div className="flex items-center justify-center w-full">
                        <label htmlFor="docFile" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {uploadedFile ? (
                              <>
                                <FileText className="w-8 h-8 mb-2 text-green-500" />
                                <p className="text-sm font-medium text-green-700 dark:text-green-400">{uploadedFile.name}</p>
                                <p className="text-xs text-muted-foreground">File uploaded successfully</p>
                              </>
                            ) : (
                              <>
                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-muted-foreground">PNG, JPG or PDF (Max. 5MB)</p>
                              </>
                            )}
                          </div>
                        </label>
                      </div>
                      <Input 
                        id="docFile" 
                        type="file" 
                        accept="image/*,application/pdf" 
                        onChange={onFileChange} 
                        className="hidden"
                      />
                    </div>
                    {errors.documentFile && <p className="text-sm text-red-500 mt-1">{(errors.documentFile as any)?.message}</p>}
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Terms & Consent</h3>
                    <p className="text-sm text-muted-foreground">Review and accept our terms to complete your application</p>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Application Summary</h4>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p><strong>Name:</strong> {watch("fullName")}</p>
                      <p><strong>Email:</strong> {watch("email")}</p>
                      <p><strong>Phone:</strong> {watch("phone")}</p>
                      <p><strong>Document:</strong> {watch("docType") === "passport" ? "Passport" : "Aadhaar"} - {watch("docNumber")}</p>
                      <p><strong>Emergency Contact:</strong> {watch("emergencyName")} ({watch("emergencyPhone")})</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <Checkbox 
                        id="consent" 
                        checked={watch("consent") || false} 
                        onCheckedChange={(v) => setValue("consent", Boolean(v), { shouldValidate: true })} 
                      />
                      <div className="space-y-2">
                        <Label htmlFor="consent" className="text-sm font-medium leading-5">
                          I agree to the Terms and Conditions and Privacy Policy
                        </Label>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          By checking this box, I consent to the verification of my documents and personal information 
                          for the purpose of creating a Digital Tourist ID. I understand that my data will be 
                          processed securely and used only for identity verification and safety monitoring purposes.
                        </p>
                      </div>
                    </div>
                    {errors.consent && <p className="text-sm text-red-500">{errors.consent.message}</p>}
                  </div>
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Next Steps:</strong> After submission, your application will be reviewed by our verification team. 
                      You'll receive email updates about your application status.
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <div className="flex justify-between pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep} 
                  disabled={step === 1}
                  className="min-w-[100px]"
                >
                  Back
                </Button>
                
                {step < 4 ? (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    className="min-w-[100px]"
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="min-w-[120px]"
                  >
                    {submitting ? "Submitting..." : "Submit Application"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
