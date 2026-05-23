import "../Paste.css";

function Paste() {
  return (
    <main className='paste-page'>
      <div className='margin-rule' aria-hidden='true' />

      <div className='content'>
        <header className='wordmark-area'>
          <span className='wordmark'>margin</span>
          <span className='microcopy'>← notes for files</span>
        </header>

        <section className='paste-section'>
          <h1 className='paste-heading'>
            Paste a <span className='ember'>file URL.</span>
          </h1>

          <p className='paste-subhead'>
            Margin will compare two versions and show what changed.
          </p>

          <div className='paste-row'>
            <input
              className='paste-input'
              type='text'
              placeholder='https://figma.com/design/...'
            />
            <button className='cta-button'>
              <span>Continue</span>
              <span className='arrow' aria-hidden='true'>
                →
              </span>
            </button>
          </div>

          <a className='helper-link' href='#'>
            how do I find this?
          </a>
        </section>
      </div>
    </main>
  );
}

export default Paste;
