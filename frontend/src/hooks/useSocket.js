import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";

export const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    const socketUrl =
      import.meta.env?.VITE_API_URL || window.location.origin;

    socketRef.current = io(socketUrl, {
      transports: ["websocket"],
      withCredentials: true,
    });

    // Listen for file upload completion
    socketRef.current.on("fileUploadCompleted", (data) => {
      toast.success(data.message || "File uploaded successfully");
    });

    // Listen for email sent
    socketRef.current.on("emailSent", (data) => {
      toast.success(data.message || "Email sent successfully");
    });

    // Listen for bulk emails sent
    socketRef.current.on("emailsSent", (data) => {
      toast.success(
        data.message || `${data.successful} emails sent successfully`
      );
    });

    // Listen for certificate generated
    socketRef.current.on("certificateGenerated", (data) => {
      toast.success(data.message || "Certificate generated successfully");
    });

    // Listen for bulk certificates generated
    socketRef.current.on("certificatesGenerated", (data) => {
      toast.success(
        data.message || `${data.successful} certificates generated successfully`
      );
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return socketRef.current;
};
