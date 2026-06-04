import "./Landing.css";
import PageShell from "../components/PageShell";

function Landing() {
  return (
    <PageShell className='landing'>
      <section className='hero'>
        <h1 className='headline'>
          What
          <br />
          <span className='ember'>changed.</span>
        </h1>

        <p className='subhead'>
          A changelog for Figma files.
          <br />
          Pick two versions, get a list you can actually read.
        </p>

        <a
          className='cta-button'
          href={`${import.meta.env.VITE_API_URL}/auth/figma`}
        >
          <span>Connect Figma</span>
          <span className='arrow' aria-hidden='true'>
            →
          </span>
        </a>

        <p className='caption'>takes 8 seconds</p>
      </section>
    </PageShell>
  );
}

export default Landing;
