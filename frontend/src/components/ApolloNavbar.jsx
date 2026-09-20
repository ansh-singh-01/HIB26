import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, ChevronDown } from 'lucide-react';

export const ApolloNavbar = ({ currentPage = 'landing' }) => {
  return (
    <div className="apollo-nav-wrapper">
      <header className="apollo-nav">
        <Link to="/" className="apollo-brand">
          <div className="apollo-logo-icon">
            <Activity className="apollo-logo-mark" size={22} />
          </div>
          <div className="apollo-brand-text">
            <span className="apollo-brand-name">
              Medi<span>Connect</span>
            </span>
            <span className="apollo-brand-tagline">AI Health Grid</span>
          </div>
        </Link>

        {currentPage === 'landing' && (
          <ul className="apollo-nav-links">
            <li className="apollo-nav-item">
              <a href="/#product-sandbox" className="apollo-nav-link">
                Platform <ChevronDown size={14} />
              </a>
            </li>
            <li className="apollo-nav-item">
              <a href="/#features" className="apollo-nav-link">
                Solutions
              </a>
            </li>
            <li className="apollo-nav-item">
              <a href="/#faq" className="apollo-nav-link">
                FAQ
              </a>
            </li>
          </ul>
        )}

        <div className="apollo-nav-actions">
          {currentPage === 'login' ? (
            <>
              <span className="apollo-nav-hint">
                New to MediConnect?
              </span>
              <Link to="/register" className="apollo-btn-primary">
                Sign Up <ArrowRight size={16} />
              </Link>
            </>
          ) : currentPage === 'register' ? (
            <>
              <span className="apollo-nav-hint">
                Already registered?
              </span>
              <Link to="/login" className="apollo-btn-primary">
                Sign In <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="apollo-btn-ghost">
                Sign In
              </Link>
              <Link to="/register" className="apollo-btn-primary">
                Sign Up <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </header>
    </div>
  );
};
