import "jest-canvas-mock";
import "@testing-library/jest-dom";
window.scrollTo = jest.fn();
Element.prototype.scrollIntoView = jest.fn();
