import React, { useState, useEffect, useRef } from "react";
import { EllipsisVertical } from "lucide-react";
import "./ExpandableMenuButton.css";

function ExpandableMenuButton({ menuItems, onClose, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        if (onClose) onClose();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [onClose]);

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleMenuItemClick = (e, handler) => {
    e.stopPropagation();
    const result = handler && handler(e);
    if (result && typeof result.then === "function") {
      result.finally(() => {
        setIsOpen(false);
        if (onClose) onClose();
      });
    } else {
      setIsOpen(false);
      if (onClose) onClose();
    }
  };

  return (
    <div className={`expandable-menu-container ${className}`} ref={menuRef}>
      <button
        className="expandable-menu-button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="More options"
      >
        <EllipsisVertical />
      </button>

      <div className={`expandable-menu ${isOpen ? "active" : ""}`} role="menu">
        {menuItems.map((item, index) => (
          <div
            key={index}
            className="menu-item"
            role="menuitem"
            tabIndex={0}
            onClick={(e) =>
              item.onClick && handleMenuItemClick(e, item.onClick)
            }
            onKeyPress={(e) => {
              if ((e.key === "Enter" || e.key === " ") && item.onClick) {
                handleMenuItemClick(e, item.onClick);
              }
            }}
          >
            {item.icon}
            {item.label}
            {item.component && item.component}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExpandableMenuButton;
