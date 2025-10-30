
"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  DocumentData,
} from "firebase/firestore";

interface UserRole {
  uid: string;
  productManager?: boolean;
  orderManager?: boolean;
  admin?: boolean;
}

const RolesPage = () => {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [uid, setUid] = useState("");
  const [role, setRole] = useState("productManager");
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const fetchUserRoles = async () => {
    try {
      const rolesCollection = collection(db, "roles");
      const snapshot = await getDocs(rolesCollection);
      const userList = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      })) as UserRole[];
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      setFeedback({
        type: "error",
        message: "Failed to fetch user roles. See console for details.",
      });
    }
  };

  useEffect(() => {
    fetchUserRoles();
  }, []);

  const handleSetRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) {
      setFeedback({ type: "error", message: "Please enter a User UID." });
      return;
    }

    try {
      const userRoleRef = doc(db, "roles", uid);
      const currentRoleDoc = await getDoc(userRoleRef);
      const currentRoles = currentRoleDoc.exists() ? currentRoleDoc.data() : {};

      const newRoles = {
        ...currentRoles,
        [role]: true,
      };

      await setDoc(userRoleRef, newRoles, { merge: true });
      setFeedback({
        type: "success",
        message: `Role '''${role}''' assigned to user '''${uid}''' successfully.`,
      });
      setUid("");
      fetchUserRoles();
    } catch (error) {
      console.error("Error setting role:", error);
      setFeedback({
        type: "error",
        message: "Failed to set role. See console for details.",
      });
    }
  };

  const handleRemoveRole = async (
    targetUid: string,
    roleToRemove: string
  ) => {
    try {
      const userRoleRef = doc(db, "roles", targetUid);
      const currentRoleDoc = await getDoc(userRoleRef);

      if (currentRoleDoc.exists()) {
        const currentRoles: DocumentData = currentRoleDoc.data();
        const { [roleToRemove]: removed, ...newRoles } = currentRoles;

        if (Object.keys(newRoles).length === 0) {
          await deleteDoc(userRoleRef);
        } else {
          await setDoc(userRoleRef, newRoles);
        }

        setFeedback({
          type: "success",
          message: `Role '''${roleToRemove}''' removed from user '''${targetUid}'''.`,
        });
        fetchUserRoles();
      }
    } catch (error) {
      console.error("Error removing role:", error);
      setFeedback({
        type: "error",
        message: "Failed to remove role. See console for details.",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Role Management</h1>

      {feedback.message && (
        <div
          className={`p-3 mb-4 rounded ${
            feedback.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSetRole} className="mb-8 p-4 border rounded shadow-md">
        <h2 className="text-xl font-semibold mb-2">Assign Role</h2>
        <div className="mb-3">
          <label htmlFor="uid" className="block font-medium mb-1">
            User UID
          </label>
          <input
            type="text"
            id="uid"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="Enter User UID"
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="role" className="block font-medium mb-1">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="admin">Admin</option>
            <option value="productManager">Product Manager</option>
            <option value="orderManager">Order Manager</option>
          </select>
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Assign Role
        </button>
      </form>

      <div>
        <h2 className="text-xl font-semibold mb-2">Current User Roles</h2>
        <div className="border rounded">
          <ul className="divide-y">
            {users.length > 0 ? (
              users.map((user) => (
                <li key={user.uid} className="p-3">
                  <p className="font-semibold">{user.uid}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.admin && (
                      <span className="bg-purple-200 px-2 py-1 rounded-full text-sm flex items-center">
                        Admin
                        <button
                          onClick={() => handleRemoveRole(user.uid, "admin")}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          &times;
                        </button>
                      </span>
                    )}
                    {user.productManager && (
                      <span className="bg-gray-200 px-2 py-1 rounded-full text-sm flex items-center">
                        Product Manager
                        <button
                          onClick={() =>
                            handleRemoveRole(user.uid, "productManager")
                          }
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          &times;
                        </button>
                      </span>
                    )}
                    {user.orderManager && (
                      <span className="bg-gray-200 px-2 py-1 rounded-full text-sm flex items-center">
                        Order Manager
                        <button
                          onClick={() =>
                            handleRemoveRole(user.uid, "orderManager")
                          }
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          &times;
                        </button>
                      </span>
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li className="p-3 text-gray-500">No user roles found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RolesPage;
