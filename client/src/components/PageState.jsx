import { Link } from "react-router-dom";
import "./PageState.css";

function PageState({
  state = "loading",
  title,
  message,
  actionLabel,
  actionTo,
  onAction,
  className = "",
}) {
  const isLoading = state === "loading";
  const isError = state === "error";
  const isEmpty = state === "empty";

  return (
    <section className={`page-state ${className}`.trim()} aria-live='polite'>
      <div className='page-state__card'>
        {isLoading && (
          <p className='page-state__status loading-text'>Loading</p>
        )}

        {title && <h1 className='page-state__title'>{title}</h1>}

        {message && <p className='page-state__message'>{message}</p>}

        {!isLoading &&
          actionLabel &&
          (actionTo ? (
            <Link to={actionTo} className='page-state__action'>
              {actionLabel}
            </Link>
          ) : (
            <button
              type='button'
              className='page-state__action'
              onClick={onAction}
            >
              {actionLabel}
            </button>
          ))}

        {isError && !actionLabel && (
          <p className='page-state__hint'>Please try again.</p>
        )}

        {isEmpty && !actionLabel && (
          <p className='page-state__hint'>Nothing to show yet.</p>
        )}
      </div>
    </section>
  );
}

export default PageState;
