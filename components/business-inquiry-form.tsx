import { brand } from "@/config/brand";
import { businessPackages } from "@/config/pricing";

export function BusinessInquiryForm() {
  return (
    <div className="inquiry-layout">
      <form className="inquiry-form" aria-describedby="form-status">
        <div className="field-grid"><label>Name<input name="name" autoComplete="name" placeholder="Your name" /></label><label>Business / Brand Name<input name="brandName" autoComplete="organization" placeholder="Your football brand" /></label></div>
        <div className="field-grid"><label>Email<input name="email" type="email" autoComplete="email" placeholder="you@example.com" /></label><label>Phone / WhatsApp<input name="phone" type="tel" autoComplete="tel" placeholder="+234" /></label></div>
        <div className="field-grid"><label>Existing Audience Size<input name="audienceSize" placeholder="e.g. 5,000 followers" /></label><label>Primary Channel<select name="primaryChannel" defaultValue=""><option value="" disabled>Select a channel</option>{["Facebook","Telegram","WhatsApp","YouTube","TikTok","Website","Other"].map(item=><option key={item}>{item}</option>)}</select></label></div>
        <label>Preferred Package<select name="preferredPackage" defaultValue=""><option value="" disabled>Select a package</option>{businessPackages.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Message<textarea name="message" rows={5} placeholder="Tell us about your audience, goals and preferred launch timeline." /></label>
        <button type="button" className="button static-submit" disabled>Online submission coming soon</button>
        <p id="form-status">This inquiry form is prepared for the backend phase and does not currently submit information.</p>
      </form>
      <aside className="direct-contact"><span className="eyebrow">Prefer direct contact?</span><h3>Speak with FABRO TECH LIMITED</h3><p>Send your requirements by email and our team can discuss the appropriate platform edition with you.</p><a className="button" href={`mailto:${brand.supportEmail}?subject=ScoreGPT Platform Inquiry`}>Email Platform Sales <span>→</span></a><small>{brand.supportEmail}</small></aside>
    </div>
  );
}
